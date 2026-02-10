import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { cloudinary } from "@/lib/cloudinary-server";

const KB = 1024;
const MB = 1024 * 1024;
const MAX_FETCH_BYTES = 110 * MB; // hard guardrail for server memory

type CompressBody = {
  assetId: string;
  targetMb?: number;
  targetKb?: number;
};

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

async function fetchToBuffer(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to fetch transformed file");
  }

  const len = Number(res.headers.get("content-length") ?? "0");
  if (Number.isFinite(len) && len > 0 && len > MAX_FETCH_BYTES) {
    throw new Error("Transformed file too large to process");
  }

  const ab = await res.arrayBuffer();
  if (ab.byteLength > MAX_FETCH_BYTES) {
    throw new Error("Transformed file too large to process");
  }

  return Buffer.from(ab);
}

async function overwriteCloudinaryAsset(params: {
  publicId: string;
  resourceType: "image" | "video";
  buffer: Buffer;
}) {
  const { publicId, resourceType, buffer } = params;

  const result = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        public_id: publicId,
        overwrite: true,
        invalidate: true,
      },
      (err, uploadResult) => {
        if (err || !uploadResult) return reject(err);
        resolve(uploadResult);
      }
    );
    stream.end(buffer);
  });

  return result;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as CompressBody | null;
  if (!body?.assetId) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const targetBytesRaw =
    typeof body.targetKb === "number"
      ? body.targetKb * KB
      : typeof body.targetMb === "number"
        ? body.targetMb * MB
        : null;

  const targetBytes =
    targetBytesRaw == null
      ? null
      : Math.round(clampNumber(targetBytesRaw, 50 * KB, 100 * MB));

  const asset = await prisma.mediaAsset.findFirst({
    where: { id: body.assetId, userId },
  });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const resourceType = asset.resourceType === "video" ? "video" : "image";
  const originalBytes = asset.bytes;

  let transformedUrl = "";
  let buffer: Buffer | null = null;
  let applied: Record<string, any> = {};
  let warning: string | undefined;

  try {
    if (resourceType === "video") {
      // Best-quality mode: let Cloudinary pick a good quality without size targeting.
      if (targetBytes == null) {
        applied = { quality: "auto:best", fetch_format: "mp4" };
        transformedUrl = cloudinary.url(asset.publicId, {
          resource_type: "video",
          secure: true,
          format: "mp4",
          transformation: [{ quality: applied.quality }, { fetch_format: applied.fetch_format }],
        });
        buffer = await fetchToBuffer(transformedUrl);
      } else {
      let duration = asset.duration ?? null;
      if (!duration || duration <= 0) {
        try {
          const info = await cloudinary.api.resource(asset.publicId, {
            resource_type: "video",
          });
          if (typeof info.duration === "number" && info.duration > 0) duration = info.duration;
        } catch {
          // ignore
        }
      }

      if (!duration || duration <= 0) {
        return NextResponse.json(
          { error: "Missing video duration; cannot estimate bitrate" },
          { status: 400 }
        );
      }

      const targetKbps = clampNumber(
        Math.floor((targetBytes * 8) / (duration * 1000)),
        200,
        8000
      );

      applied = { bit_rate: `${targetKbps}k`, quality: "auto" };

      transformedUrl = cloudinary.url(asset.publicId, {
        resource_type: "video",
        secure: true,
        format: asset.originalFormat || "mp4",
        transformation: [{ bit_rate: applied.bit_rate }, { quality: applied.quality }],
      });

      buffer = await fetchToBuffer(transformedUrl);

      if (buffer.length > targetBytes) {
        warning = "Could not reach target size exactly; used best-effort compression.";
      }
      }
    } else {
      // image + pdf
      const isPdf = asset.originalFormat === "pdf";

      // Best-quality mode (no target): use Cloudinary auto quality.
      if (targetBytes == null) {
        applied = { quality: "auto:best" };
        transformedUrl = cloudinary.url(asset.publicId, {
          resource_type: "image",
          secure: true,
          format: isPdf ? "pdf" : asset.originalFormat,
          transformation: [{ quality: applied.quality }],
        });
        buffer = await fetchToBuffer(transformedUrl);
      } else {
        const qualities = [80, 60, 45, 30, 20];

        let best: { q: number; buf: Buffer; url: string } | null = null;

        for (const q of qualities) {
          const url = cloudinary.url(asset.publicId, {
            resource_type: "image",
            secure: true,
            format: isPdf ? "pdf" : asset.originalFormat,
            transformation: [{ quality: q }],
          });

          const buf = await fetchToBuffer(url);

          if (!best || buf.length < best.buf.length) {
            best = { q, buf, url };
          }

          if (buf.length <= targetBytes) {
            best = { q, buf, url };
            break;
          }
        }

        if (!best) throw new Error("Compression failed");
        applied = { quality: best.q };
        transformedUrl = best.url;
        buffer = best.buf;

        if (buffer.length > targetBytes) {
          warning = "Could not reach target size exactly; used best-effort compression.";
        }
      }
    }

    if (!buffer) throw new Error("Compression failed");

    const uploadResult = await overwriteCloudinaryAsset({
      publicId: asset.publicId,
      resourceType,
      buffer,
    });

    const updated = await prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        publicId: uploadResult.public_id ?? asset.publicId,
        resourceType: uploadResult.resource_type ?? asset.resourceType,
        originalFormat: uploadResult.format ?? asset.originalFormat,
        bytes: uploadResult.bytes ?? asset.bytes,
        width: uploadResult.width ?? asset.width,
        height: uploadResult.height ?? asset.height,
        duration: uploadResult.duration ?? asset.duration,
      },
    });

    const resultUrl = String(uploadResult.secure_url || transformedUrl);

    await prisma.conversion.create({
      data: {
        userId,
        assetId: updated.id,
        kind: "compress",
        targetFormat: updated.originalFormat,
        options: {
          mode: targetBytes == null ? "best_quality" : "target_size",
          targetBytes: targetBytes ?? undefined,
          originalBytes,
          achievedBytes: updated.bytes,
          applied,
          warning,
        },
        resultUrl,
      },
    });

    return NextResponse.json({
      resultUrl,
      originalBytes,
      bytes: updated.bytes,
      targetBytes,
      warning,
      format: updated.originalFormat,
      resourceType: updated.resourceType,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Compression failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
