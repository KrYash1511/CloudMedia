"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import { getCldImageUrl, getCldVideoUrl } from "next-cloudinary";
import {
  Shrink,
} from "lucide-react";
import { filesize } from "filesize";
import { authHeaders } from "@/lib/api-client";

export default function Home() {
  const [compressions, setCompressions] = useState<any[]>([]);
  const [compressionFilter, setCompressionFilter] = useState<
    "all" | "video" | "pdf" | "images"
  >("all");
  const [hoveredPreviewId, setHoveredPreviewId] = useState<string | null>(null);
  const [previewFailedById, setPreviewFailedById] = useState<Record<string, true>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getVideoThumbnailUrl = useCallback((publicId: string) => {
    return getCldImageUrl({
      src: publicId,
      width: 560,
      height: 315,
      crop: "fill",
      gravity: "auto",
      format: "jpg",
      quality: "auto",
      assetType: "video",
    });
  }, []);

  const getVideoHoverPreviewUrl = useCallback((publicId: string) => {
    return getCldVideoUrl({
      src: publicId,
      width: 560,
      height: 315,
      rawTransformations: [
        // Use the same transformation string as the previously working VideoCard
        // (Cloudinary generates a short preview clip)
        "e_preview:duration_15:max_seg_9:min_seg_dur_1",
      ],
    });
  }, []);

  const fetchCompressions = useCallback(async () => {
    try {
      const response = await axios.get("/api/compressions", {
        headers: await authHeaders(),
      });
      if (Array.isArray(response.data)) setCompressions(response.data);
      else throw new Error("Invalid response format");
    } catch (e) {
      console.log(e);
      setError("Failed to fetch compression history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompressions();
  }, [fetchCompressions]);

  const downloadViaProxy = useCallback(async (remoteUrl: string, filename: string) => {
    const proxyUrl =
      "/api/download?" +
      new URLSearchParams({ url: remoteUrl, filename }).toString();
    const headers = await authHeaders();
    const res = await fetch(proxyUrl, { headers });
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
  }, []);

  /* ── Loading ─────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  /* ── Error ──────────────────────────────────── */
  if (error) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-lg font-semibold text-error">{error}</p>
        <button className="btn btn-sm btn-outline" onClick={fetchCompressions}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm opacity-60 mt-1">
            Your compression history &mdash; only you can see these.
          </p>
        </div>
        <Link href="/compress-media" className="btn btn-primary btn-sm rounded-xl gap-2">
          <Shrink className="w-4 h-4" /> Compress Media
        </Link>
      </div>

      {compressions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="bg-base-200 rounded-full p-6">
            <Shrink className="w-10 h-10 opacity-30" />
          </div>
          <h2 className="text-lg font-semibold">No compressions yet</h2>
          <p className="text-sm opacity-50 max-w-sm">
            Compress an image, PDF, or video and it will appear here.
          </p>
          <Link href="/compress-media" className="btn btn-primary btn-sm rounded-xl gap-2 mt-2">
            <Shrink className="w-4 h-4" /> Compress Media
          </Link>
        </div>
      ) : (
        <div className="bg-base-200/40 border border-base-300/30 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide opacity-50">
                Compression History
              </h2>
              <p className="text-xs opacity-50 mt-1">
                Hover videos to see a 10s preview.
              </p>
            </div>
            <Link href="/compress-media" className="btn btn-ghost btn-sm rounded-xl">
              New
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            {([
              { key: "all", label: "All" },
              { key: "video", label: "Video" },
              { key: "pdf", label: "PDF" },
              { key: "images", label: "Images" },
            ] as const).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setCompressionFilter(f.key)}
                className={`btn btn-sm rounded-xl ${
                  compressionFilter === f.key ? "btn-primary" : "btn-ghost"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {compressions
              .filter((c) => {
                if (compressionFilter === "all") return true;
                const rt = String(c?.asset?.resourceType || "");
                const fmt = String(c?.asset?.originalFormat || "");
                if (compressionFilter === "video") return rt === "video";
                if (compressionFilter === "pdf") return rt === "image" && fmt === "pdf";
                return rt === "image" && fmt !== "pdf";
              })
              .map((c) => {
              const publicId: string | undefined = c?.asset?.publicId;
              const name = publicId?.split("/")?.pop() || "asset";
              const opts = c?.options || {};
              const originalBytes = Number(opts?.originalBytes ?? 0);
              const achievedBytes = Number(opts?.achievedBytes ?? 0);
              const saved = originalBytes > 0 && achievedBytes > 0 ? originalBytes - achievedBytes : 0;
              const percent =
                originalBytes > 0 && achievedBytes > 0
                  ? Math.max(0, Math.min(100, Math.round((saved / originalBytes) * 100)))
                  : null;
              const url: string | undefined = c?.resultUrl;
              const createdAt = c?.createdAt ? new Date(c.createdAt) : null;

              const rt = String(c?.asset?.resourceType || "");
              const fmt = String(c?.asset?.originalFormat || "");
              const previewKind: "video" | "pdf" | "image" | "none" = !url
                ? "none"
                : rt === "video"
                  ? "video"
                  : fmt === "pdf"
                    ? "pdf"
                    : "image";

              const isHovered = hoveredPreviewId === c.id;
              const previewFailed = Boolean(previewFailedById[c.id]);

              return (
                <div
                  key={c.id}
                  className="group bg-base-100 border border-base-300/30 rounded-2xl overflow-hidden"
                >
                  <div
                    className="aspect-video bg-base-300/30 relative"
                    onPointerEnter={() => previewKind === "video" && setHoveredPreviewId(c.id)}
                    onPointerLeave={() => setHoveredPreviewId(null)}
                    onMouseEnter={() => previewKind === "video" && setHoveredPreviewId(c.id)}
                    onMouseLeave={() => setHoveredPreviewId(null)}
                  >
                    {previewKind === "none" ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs opacity-40">No preview</span>
                      </div>
                    ) : previewKind === "image" ? (
                      <img
                        src={url}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    ) : previewKind === "pdf" ? (
                      <embed
                        src={url}
                        type="application/pdf"
                        className="w-full h-full"
                      />
                    ) : publicId ? (
                      isHovered ? (
                        previewFailed ? (
                          <video
                            className="w-full h-full object-cover"
                            controls
                            preload="metadata"
                          >
                            <source src={url} />
                          </video>
                        ) : (
                          <video
                            src={getVideoHoverPreviewUrl(publicId)}
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            poster={getVideoThumbnailUrl(publicId)}
                            className="w-full h-full object-cover"
                            onError={() =>
                              setPreviewFailedById((prev) => ({ ...prev, [c.id]: true }))
                            }
                          />
                        )
                      ) : (
                        <img
                          src={getVideoThumbnailUrl(publicId)}
                          alt="Video thumbnail"
                          className="w-full h-full object-cover"
                        />
                      )
                    ) : (
                      <video
                        className="w-full h-full object-cover"
                        controls
                        preload="metadata"
                      >
                        <source src={url} />
                      </video>
                    )}

                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="badge badge-ghost badge-sm">
                        {previewKind === "video" ? "Video" : previewKind === "pdf" ? "PDF" : previewKind === "image" ? "Image" : "File"}
                      </span>
                      {percent != null && (
                        <span className="badge badge-primary badge-sm">
                          {percent}% smaller
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 flex flex-col gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{name}</p>
                      <p className="text-xs opacity-60 mt-0.5">
                        {originalBytes ? `${filesize(originalBytes) as string} → ` : ""}
                        {achievedBytes ? `${filesize(achievedBytes) as string}` : "—"}
                        {saved > 0 ? ` (saved ${filesize(saved) as string})` : ""}
                      </p>
                      {createdAt && (
                        <p className="text-xs opacity-50 mt-1">
                          {createdAt.toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline btn-sm rounded-xl"
                        >
                          Open
                        </a>
                      )}
                      {url && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm rounded-xl"
                          onClick={() =>
                            void downloadViaProxy(url, `${name}.${c?.targetFormat || "bin"}`)
                          }
                        >
                          Download
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}