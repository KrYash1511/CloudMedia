import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cloudinary } from "@/lib/cloudinary-server";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);

// Force Node.js runtime (Ghostscript requires child_process)
export const runtime = "nodejs";

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

// ── Ghostscript helpers ──

function getGhostscriptCandidates(): string[] {
  const fromEnv = process.env.GS_BINARY?.trim();

  if (process.platform === "win32") {
    const candidates = [
      "C:\\Program Files\\gs\\gs10.04.0\\bin\\gswin64c.exe",
      "C:\\Program Files\\gs\\gs10.03.1\\bin\\gswin64c.exe",
      "C:\\Program Files\\gs\\gs10.02.1\\bin\\gswin64c.exe",
      "C:\\Program Files (x86)\\gs\\gs10.04.0\\bin\\gswin32c.exe",
      "gswin64c.exe",
      "gswin32c.exe",
      "gs",
    ];
    return fromEnv ? [fromEnv, ...candidates] : candidates;
  }

  const candidates = [
    "gs",
    "/usr/bin/gs",
    "/bin/gs",
    "/nix/var/nix/profiles/default/bin/gs",
    "/etc/profiles/per-user/root/bin/gs",
    "ghostscript",
  ];

  return fromEnv ? [fromEnv, ...candidates] : candidates;
}

async function runGhostscript(args: string[], timeout = 120_000) {
  const attempted: string[] = [];

  for (const candidate of getGhostscriptCandidates()) {
    attempted.push(candidate);
    try {
      await execFileAsync(candidate, args, { timeout });
      return;
    } catch (error: any) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
  }

  throw new Error(
    `Ghostscript binary not found. Tried: ${attempted.join(", ")}. ` +
      `Set GS_BINARY env var to the full path of gs.`
  );
}

const GS_QUALITY_SETTINGS = [
  "/ebook",    // 150 dpi – good balance
  "/screen",   // 72 dpi  – smallest
] as const;

async function compressPdfWithGhostscript(
  inputBuffer: Buffer,
  setting: string
): Promise<Buffer> {
  const tmp = tmpdir();
  const ts = Date.now();
  const inputPath = join(tmp, `pdf_in_${ts}.pdf`);
  const outputPath = join(tmp, `pdf_out_${ts}.pdf`);

  await writeFile(inputPath, inputBuffer);

  try {
    await runGhostscript([
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      `-dPDFSETTINGS=${setting}`,
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      "-dAutoRotatePages=/None",
      `-sOutputFile=${outputPath}`,
      inputPath,
    ]);

    return await readFile(outputPath);
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

/**
 * Compress a PDF with explicit DPI and JPEG quality settings.
 * This gives fine-grained control over the output size.
 */
async function compressPdfCustomDpi(
  inputBuffer: Buffer,
  dpi: number,
  jpegQuality: number
): Promise<Buffer> {
  const tmp = tmpdir();
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const inputPath = join(tmp, `pdf_in_${ts}_${rand}.pdf`);
  const outputPath = join(tmp, `pdf_out_${ts}_${rand}.pdf`);

  await writeFile(inputPath, inputBuffer);

  try {
    await runGhostscript([
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      "-dAutoRotatePages=/None",
      // Downsample all images to the specified DPI
      `-dColorImageResolution=${dpi}`,
      `-dGrayImageResolution=${dpi}`,
      `-dMonoImageResolution=${dpi}`,
      "-dDownsampleColorImages=true",
      "-dDownsampleGrayImages=true",
      "-dDownsampleMonoImages=true",
      "-dColorImageDownsampleType=/Bicubic",
      "-dGrayImageDownsampleType=/Bicubic",
      "-dMonoImageDownsampleType=/Bicubic",
      // Compress images with JPEG at the given quality
      "-dAutoFilterColorImages=false",
      "-dAutoFilterGrayImages=false",
      "-dColorImageFilter=/DCTEncode",
      "-dGrayImageFilter=/DCTEncode",
      `-dJPEGQ=${jpegQuality}`,
      // Optimize fonts and duplicates
      "-dDetectDuplicateImages=true",
      "-dCompressFonts=true",
      "-dSubsetFonts=true",
      `-sOutputFile=${outputPath}`,
      inputPath,
    ]);

    return await readFile(outputPath);
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

async function fetchToBuffer(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    console.error(`[fetchToBuffer] HTTP ${res.status} for URL: ${url}`);
    throw new Error(`Failed to fetch file (HTTP ${res.status})`);
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

/**
 * Use Cloudinary's explicit API with eager transformations.
 * Unlike URL-based on-the-fly transforms, this processes the
 * transformation synchronously on Cloudinary's servers so it's
 * ready to download immediately — essential for video & PDF.
 */
async function processWithExplicit(params: {
  publicId: string;
  resourceType: "image" | "video";
  transformation: Record<string, any>;
}): Promise<{ secure_url: string; bytes: number }> {
  const { publicId, resourceType, transformation } = params;

  const result: any = await cloudinary.uploader.explicit(publicId, {
    resource_type: resourceType,
    type: "upload",
    eager: [transformation],
    eager_async: false,
  });

  const eager = result?.eager?.[0];
  if (!eager || !eager.secure_url) {
    throw new Error("Transformation processing failed");
  }

  return {
    secure_url: eager.secure_url,
    bytes: eager.bytes ?? 0,
  };
}

export async function POST(req: NextRequest) {
  const userId = await verifyAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Parse request: FormData for PDFs (carries the raw file), JSON for everything else
  const contentType = req.headers.get("content-type") || "";
  const isFormData = contentType.includes("multipart/form-data");

  let assetId: string | null = null;
  let targetKb: number | undefined;
  let targetMb: number | undefined;
  let pdfFile: File | null = null;

  if (isFormData) {
    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "Bad request" }, { status: 400 });
    assetId = form.get("assetId") as string | null;
    const tkb = form.get("targetKb");
    const tmb = form.get("targetMb");
    if (tkb) targetKb = Number(tkb);
    if (tmb) targetMb = Number(tmb);
    pdfFile = form.get("file") as File | null;
  } else {
    const body = (await req.json().catch(() => null)) as CompressBody | null;
    if (body) {
      assetId = body.assetId;
      targetKb = body.targetKb;
      targetMb = body.targetMb;
    }
  }

  if (!assetId) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const targetBytesRaw =
    typeof targetKb === "number" && !isNaN(targetKb)
      ? targetKb * KB
      : typeof targetMb === "number" && !isNaN(targetMb)
        ? targetMb * MB
        : null;

  const targetBytes =
    targetBytesRaw == null
      ? null
      : Math.round(clampNumber(targetBytesRaw, 50 * KB, 100 * MB));

  const asset = await prisma.mediaAsset.findFirst({
    where: { id: assetId, userId },
  });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const resourceType = asset.resourceType === "video" ? "video" : "image";
  const originalBytes = asset.bytes;
  const isPdf = asset.originalFormat === "pdf";

  // Validate: target must be smaller than original
  if (targetBytes != null && targetBytes >= originalBytes) {
    return NextResponse.json(
      { error: "Target size must be smaller than the original file size" },
      { status: 400 }
    );
  }

  let transformedUrl = "";
  let buffer: Buffer | null = null;
  let applied: Record<string, any> = {};
  let warning: string | undefined;

  try {
    if (resourceType === "video") {
      // ── Video: use explicit() with eager transformations ──
      // Cloudinary processes video transforms asynchronously, so on-the-fly
      // URL fetches fail (404/423).  The explicit API with eager_async:false
      // waits for processing to finish before returning.
      if (targetBytes == null) {
        applied = { quality: "auto:best", format: "mp4" };

        const eager = await processWithExplicit({
          publicId: asset.publicId,
          resourceType: "video",
          transformation: { quality: "auto:best", format: "mp4" },
        });

        transformedUrl = eager.secure_url;
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

        const eager = await processWithExplicit({
          publicId: asset.publicId,
          resourceType: "video",
          transformation: {
            bit_rate: `${targetKbps}k`,
            quality: "auto",
            format: asset.originalFormat || "mp4",
          },
        });

        transformedUrl = eager.secure_url;
        buffer = await fetchToBuffer(transformedUrl);

        if (buffer.length > targetBytes) {
          warning = "Could not reach target size exactly; used best-effort compression.";
        }
      }
    } else if (isPdf) {
      // ── PDF: compress with Ghostscript ──
      // Cloudinary can't compress PDFs, so we handle this entirely server-side.
      // The PDF file is sent as FormData from the frontend.

      if (!pdfFile || pdfFile.type !== "application/pdf") {
        return NextResponse.json(
          { error: "PDF file is required for PDF compression" },
          { status: 400 }
        );
      }

      const originalPdfBuffer = Buffer.from(await pdfFile.arrayBuffer());

      if (targetBytes == null) {
        // No target – best quality: use /prepress (300 dpi, highest quality)
        buffer = await compressPdfWithGhostscript(originalPdfBuffer, "/prepress");
        applied = { method: "ghostscript", setting: "/prepress" };
      } else {
        // ── Strategy: find the HIGHEST quality that fits within targetBytes ──
        // We binary-search from high quality (300 DPI, JPEG 95) down to
        // low quality (20 DPI, JPEG 20), keeping the best result that fits.

        const MAX_DPI = 300;
        const MIN_DPI = 20;
        const MAX_JPEG = 95;
        const MIN_JPEG = 20;

        // Helper: map a DPI value to a proportional JPEG quality
        const dpiToJpeg = (dpi: number) =>
          Math.round(MIN_JPEG + ((dpi - MIN_DPI) / (MAX_DPI - MIN_DPI)) * (MAX_JPEG - MIN_JPEG));

        // 1) Try highest quality first – if it already fits, return it
        const highResult = await compressPdfCustomDpi(originalPdfBuffer, MAX_DPI, MAX_JPEG);
        if (highResult.length <= targetBytes) {
          buffer = highResult;
          applied = { method: "ghostscript_custom", dpi: MAX_DPI, jpegQuality: MAX_JPEG };
        } else {
          // 2) Check if lowest quality can reach the target at all
          const lowResult = await compressPdfCustomDpi(originalPdfBuffer, MIN_DPI, MIN_JPEG);

          if (lowResult.length > targetBytes) {
            // Even minimum quality can't reach target – return smallest possible
            buffer = lowResult;
            applied = { method: "ghostscript_custom", dpi: MIN_DPI, jpegQuality: MIN_JPEG };
            warning = "Could not reach target size; used maximum compression for best quality.";
          } else {
            // 3) Binary search: find highest DPI (best quality) where output ≤ targetBytes
            let lo = MIN_DPI;
            let hi = MAX_DPI;
            let bestBuf: Buffer = lowResult;
            let bestDpi = MIN_DPI;
            let bestQ = MIN_JPEG;

            for (let i = 0; i < 10; i++) {
              if (lo > hi) break;
              const midDpi = Math.round((lo + hi) / 2);
              const midQ = dpiToJpeg(midDpi);
              const attempt = await compressPdfCustomDpi(originalPdfBuffer, midDpi, midQ);

              if (attempt.length <= targetBytes) {
                // Fits! This is a candidate – try even higher quality
                bestBuf = attempt;
                bestDpi = midDpi;
                bestQ = midQ;
                lo = midDpi + 1;
              } else {
                // Too big – must reduce quality
                hi = midDpi - 1;
              }
            }

            buffer = bestBuf;
            applied = { method: "ghostscript_custom", dpi: bestDpi, jpegQuality: bestQ };
          }
        }

        if (buffer && buffer.length > targetBytes && !warning) {
          warning = "Could not reach target size exactly; used best-effort compression.";
        }
      }

      // If gs output is somehow bigger than original, return original
      if (buffer && buffer.length >= originalPdfBuffer.length) {
        buffer = originalPdfBuffer;
        warning = "PDF is already well-compressed; returning original.";
      }
    } else {
        // Regular images: on-the-fly URL transforms work fine.
        if (targetBytes == null) {
          applied = { quality: "auto:best" };
          transformedUrl = cloudinary.url(asset.publicId, {
            resource_type: "image",
            secure: true,
            format: asset.originalFormat,
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
              format: asset.originalFormat,
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

    let uploadResult: any;

    if (isPdf) {
      // Upload compressed PDF as raw resource so Cloudinary serves it
      // as an actual PDF file (not as an image thumbnail).
      uploadResult = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: "raw",
            public_id: asset.publicId + "_compressed",
            overwrite: true,
            invalidate: true,
            format: "pdf",
          },
          (err, result) => {
            if (err || !result) return reject(err);
            resolve(result);
          }
        );
        stream.end(buffer);
      });
    } else {
      uploadResult = await overwriteCloudinaryAsset({
        publicId: asset.publicId,
        resourceType,
        buffer,
      });
    }

    const updated = await prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        publicId: uploadResult.public_id ?? asset.publicId,
        resourceType: isPdf ? "image" : (uploadResult.resource_type ?? asset.resourceType),
        originalFormat: isPdf ? "pdf" : (uploadResult.format ?? asset.originalFormat),
        bytes: uploadResult.bytes ?? buffer.length,
        width: isPdf ? null : (uploadResult.width ?? asset.width),
        height: isPdf ? null : (uploadResult.height ?? asset.height),
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
      bytes: isPdf ? buffer.length : updated.bytes,
      targetBytes,
      warning,
      format: isPdf ? "pdf" : updated.originalFormat,
      resourceType: updated.resourceType,
      ...(isPdf ? { pdfBase64: buffer.toString("base64") } : {}),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Compression failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
