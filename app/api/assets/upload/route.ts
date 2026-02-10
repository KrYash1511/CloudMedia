import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cloudinary } from "@/lib/cloudinary-server";

const MAX_VIDEO_AUDIO_BYTES = 100 * 1024 * 1024; // 100MB

function pickResourceType(mime: string | undefined) {
  if (!mime) return "auto" as const;
  if (mime === "application/pdf") return "image" as const; // important for PDF thumbnails
  if (mime.startsWith("image/")) return "image" as const;
  // Cloudinary handles video+audio under resource_type "video"
  if (mime.startsWith("video/") || mime.startsWith("audio/")) return "video" as const;
  return "auto" as const;
}

export async function POST(req: NextRequest) {
  const userId = await verifyAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });

  // Guardrail: avoid buffering extremely large video/audio uploads in memory.
  // (Note: some hosting providers may enforce stricter request limits.)
  if (
    (file.type?.startsWith("video/") || file.type?.startsWith("audio/")) &&
    file.size > MAX_VIDEO_AUDIO_BYTES
  ) {
    return NextResponse.json(
      { error: "File too large. Max size is 100 MB." },
      { status: 413 }
    );
  }

  const resourceType = pickResourceType(file.type);
  const buffer = Buffer.from(await file.arrayBuffer());

  const uploadResult = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: `cloudmedia/${userId}`,
      },
      (err, result) => {
        if (err || !result) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

  const asset = await prisma.mediaAsset.create({
    data: {
      userId,
      publicId: uploadResult.public_id,
      resourceType: uploadResult.resource_type,
      mimeType: file.type || null,
      originalFormat: uploadResult.format ?? "unknown",
      bytes: uploadResult.bytes ?? 0,
      width: uploadResult.width ?? null,
      height: uploadResult.height ?? null,
      duration: uploadResult.duration ?? null,
    },
  });

  return NextResponse.json({
    assetId: asset.id,
    publicId: asset.publicId,
    resourceType: asset.resourceType,
    originalFormat: asset.originalFormat,
    bytes: asset.bytes,
    width: asset.width,
    height: asset.height,
    duration: asset.duration,
  });
}