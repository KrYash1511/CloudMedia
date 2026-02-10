import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * Proxy-download endpoint.
 * Fetches the remote file server-side (no CORS issues) and streams it to the browser
 * with proper Content-Disposition so the browser triggers a download.
 *
 * Usage:  GET /api/download?url=<encoded_url>&filename=<desired_name>
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.searchParams.get("url");
  const filename = req.nextUrl.searchParams.get("filename") || "download";

  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  // Only allow Cloudinary URLs to prevent open-redirect / SSRF
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("cloudinary.com")) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const upstream = await fetch(url, { cache: "no-store" });
  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Upstream fetch failed" },
      { status: upstream.status }
    );
  }

  const contentType =
    upstream.headers.get("content-type") || "application/octet-stream";

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
