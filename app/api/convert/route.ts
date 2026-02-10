import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cloudinary } from "@/lib/cloudinary-server";
import { PDFDocument } from "pdf-lib";

/* Helper: get Cloudinary page count via Admin API, fall back to fetching the
   raw PDF and counting with pdf-lib. */
async function getPdfPageCount(publicId: string): Promise<number> {
  try {
    const info = await cloudinary.api.resource(publicId, {
      resource_type: "image",
      pages: true,
    });
    if (typeof info.pages === "number" && info.pages > 0) return info.pages;
  } catch {
    /* admin API unavailable — fall through */
  }

  /* Fallback: fetch the binary and use pdf-lib */
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const url = `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}.pdf`;
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) throw new Error("Failed to fetch PDF from Cloudinary");
  const bytes = new Uint8Array(await resp.arrayBuffer());
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.getPageCount();
}

const IMAGE_OUT = new Set(["jpg", "png", "webp", "avif", "pdf"]);
const VIDEO_OUT = new Set(["mp4", "webm", "gif", "mp3", "wav", "m4a"]);

type ConvertBody =
  | { assetId: string; kind: "image_format"; targetFormat: "jpg" | "png" | "webp" | "avif"; quality?: "auto" | number }
  | { assetIds: string[]; kind: "images_to_pdf"; quality?: "auto" | number }
  | { assetId: string; kind: "pdf_to_image"; targetFormat: "jpg" | "png" | "webp"; density?: number }
  | { assetId: string; kind: "video_to_audio"; targetFormat: "mp3" | "wav" | "m4a"; audioBitrate?: string };

  export async function POST(req: NextRequest) {
  const userId = await verifyAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as ConvertBody | null;
  if (!body || !("kind" in body)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const primaryAssetId = "assetId" in body ? body.assetId : body.assetIds?.[0];
  if (!primaryAssetId) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const asset = await prisma.mediaAsset.findFirst({ where: { id: primaryAssetId, userId } });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let resultUrl = "";
  let targetFormat = "";
  let options: any = {};

  // IMAGE conversions (asset.resourceType should be "image" for PDFs too in our upload flow)
  if (body.kind === "image_format") {
    targetFormat = body.targetFormat;
    if (asset.resourceType !== "image" || !IMAGE_OUT.has(targetFormat)) {
      return NextResponse.json({ error: "Unsupported conversion" }, { status: 400 });
    }

    options = { quality: body.quality ?? "auto" };
    resultUrl = cloudinary.url(asset.publicId, {
      resource_type: "image",
      secure: true,
      format: targetFormat,
      transformation: [{ quality: options.quality }, { fetch_format: targetFormat }],
    });
  }

  if (body.kind === "images_to_pdf") {
    targetFormat = "pdf";
    const assetIds = Array.isArray(body.assetIds) ? body.assetIds : [];
    const uniqueAssetIds = Array.from(new Set(assetIds)).filter(Boolean);
    if (uniqueAssetIds.length < 1) {
      return NextResponse.json({ error: "Select at least 1 image" }, { status: 400 });
    }

    const assets = await prisma.mediaAsset.findMany({
      where: {
        id: { in: uniqueAssetIds },
        userId,
        resourceType: "image",
      },
      orderBy: { createdAt: "asc" },
    });

    if (assets.length !== uniqueAssetIds.length) {
      return NextResponse.json({ error: "One or more assets not found" }, { status: 404 });
    }

    const pdf = await PDFDocument.create();

    // Fetch each image via Cloudinary as JPG for reliable embedding.
    for (const a of assets) {
      const imgUrl = cloudinary.url(a.publicId, {
        resource_type: "image",
        secure: true,
        format: "jpg",
        transformation: [{ quality: "auto" }],
      });

      const resp = await fetch(imgUrl, { cache: "no-store" });
      if (!resp.ok) {
        return NextResponse.json({ error: "Failed to fetch source image" }, { status: 400 });
      }

      const bytes = new Uint8Array(await resp.arrayBuffer());
      const embedded = await pdf.embedJpg(bytes);
      const page = pdf.addPage([embedded.width, embedded.height]);
      page.drawImage(embedded, {
        x: 0,
        y: 0,
        width: embedded.width,
        height: embedded.height,
      });
    }

    const pdfBytes = await pdf.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
    options = { count: assets.length };

    // Save conversion record (no URL since PDF is returned inline)
    await prisma.conversion.create({
      data: {
        userId,
        assetId: asset.id,
        kind: body.kind,
        targetFormat: "pdf",
        options,
        resultUrl: "inline:base64",
      },
    });

    // Return PDF bytes directly — no Cloudinary upload needed
    return NextResponse.json({ pdfBase64 });
  }

  if (body.kind === "pdf_to_image") {
    targetFormat = body.targetFormat;
    if (asset.resourceType !== "image" || !["jpg", "png", "webp"].includes(targetFormat)) {
      return NextResponse.json({ error: "Unsupported conversion" }, { status: 400 });
    }

    const density = body.density ? Math.max(72, Math.min(300, body.density)) : 150;

    // Detect page count via Admin API (fast) or fallback fetch
    let pageCount: number;
    try {
      pageCount = await getPdfPageCount(asset.publicId);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed to determine PDF page count" },
        { status: 400 }
      );
    }

    // Generate a Cloudinary URL for each page
    const pageUrls: string[] = [];
    for (let pg = 1; pg <= pageCount; pg++) {
      const url = cloudinary.url(asset.publicId, {
        resource_type: "image",
        secure: true,
        format: targetFormat,
        transformation: [
          { density },
          { page: pg },
          { quality: "auto" },
        ],
      });
      pageUrls.push(url);
    }

    options = { density, pageCount };

    await prisma.conversion.create({
      data: {
        userId,
        assetId: asset.id,
        kind: body.kind,
        targetFormat,
        options,
        resultUrl: `${pageCount} pages`,
      },
    });

    return NextResponse.json({ pageUrls, pageCount });
  }

  // VIDEO conversions (Cloudinary uses resource_type "video" for video and audio)
  if (body.kind === "video_to_audio") {
    targetFormat = body.targetFormat;
    if (asset.resourceType !== "video" || !VIDEO_OUT.has(targetFormat)) {
      return NextResponse.json({ error: "Unsupported conversion" }, { status: 400 });
    }

    options = { audioBitrate: body.audioBitrate ?? undefined };
    resultUrl = cloudinary.url(asset.publicId, {
      resource_type: "video",
      secure: true,
      format: targetFormat,
      transformation: [
        { quality: "auto" },
        ...(options.audioBitrate ? [{ audio_frequency: options.audioBitrate }] : []),
      ],
    });
  }

  if (!resultUrl) return NextResponse.json({ error: "Unsupported conversion" }, { status: 400 });

  await prisma.conversion.create({
    data: {
      userId,
      assetId: asset.id,
      kind: body.kind,
      targetFormat,
      options,
      resultUrl,
    },
  });

  return NextResponse.json({ resultUrl });
}