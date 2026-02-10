"use client";

import React, { useMemo, useState } from "react";
import { Download, FileImage, FileText, Film } from "lucide-react";
import JSZip from "jszip";

const MAX_VIDEO_AUDIO_BYTES = 100 * 1024 * 1024; // 100MB

type TabKey = "image" | "pdf" | "video";

type UploadedAsset = {
  assetId: string;
  publicId: string;
  resourceType: "image" | "video";
  originalFormat: string;
  bytes: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
};

type ConvertKind =
  | "image_format"
  | "images_to_pdf"
  | "pdf_to_image"
  | "video_to_audio";

const tabMeta: Record<
  TabKey,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  image: { label: "Image", icon: FileImage },
  pdf: { label: "PDF", icon: FileText },
  video: { label: "Video / Audio", icon: Film },
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let idx = 0;
  let value = bytes;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
}

async function downloadViaProxy(remoteUrl: string, filename: string) {
  const proxyUrl =
    "/api/download?" +
    new URLSearchParams({ url: remoteUrl, filename }).toString();
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  downloadBlob(blob, filename);
}

export default function ConvertPage() {
  const [tab, setTab] = useState<TabKey>("image");

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pageImageUrls, setPageImageUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [imageFormat, setImageFormat] = useState<"jpg" | "png" | "webp" | "avif">(
    "webp"
  );
  const [pdfToImageFormat, setPdfToImageFormat] = useState<"jpg" | "png" | "webp">(
    "jpg"
  );
  const [audioFormat, setAudioFormat] = useState<"mp3" | "wav" | "m4a">("mp3");

  const primaryAsset = assets[0] ?? null;
  const isPdf =
    primaryAsset?.resourceType === "image" && primaryAsset.originalFormat === "pdf";

  const allowedKinds: ConvertKind[] = useMemo(() => {
    if (assets.length === 0) {
      if (tab === "image") return ["image_format", "images_to_pdf"];
      if (tab === "pdf") return ["pdf_to_image"];
      return ["video_to_audio"];
    }

    if (tab === "image") {
      if (primaryAsset?.resourceType !== "image" || isPdf) return [];
      return ["image_format", "images_to_pdf"];
    }

    if (tab === "pdf") {
      return primaryAsset?.resourceType === "image" && isPdf ? ["pdf_to_image"] : [];
    }

    return primaryAsset?.resourceType === "video" ? ["video_to_audio"] : [];
  }, [assets, tab, isPdf, primaryAsset?.resourceType]);

  const [kind, setKind] = useState<ConvertKind>("image_format");

  // Keep kind valid when user switches tab or uploads new files
  React.useEffect(() => {
    if (allowedKinds.length === 0) return;
    if (!allowedKinds.includes(kind)) setKind(allowedKinds[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, primaryAsset?.assetId, assets.length]);

  const resultPreviewType = useMemo<"image" | "audio" | "file">(() => {
    if (kind === "video_to_audio") return "audio";
    if (kind === "images_to_pdf") return "file";
    return "image";
  }, [kind]);

  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const uploadAccept = useMemo(() => {
    if (tab === "image") return "image/*";
    if (tab === "pdf") return "application/pdf";
    return "video/*,audio/*";
  }, [tab]);

  const uploadHint = useMemo(() => {
    if (tab === "image") {
      if (kind === "images_to_pdf") {
        return "Upload one or more images. Select multiple to merge into a single PDF.";
      }
      return "Upload a single image to convert to another format.";
    }
    if (tab === "pdf") return "Upload a PDF to export a page as an image.";
    return "Upload a video to extract audio (MP3/WAV/M4A).";
  }, [tab, kind]);

  const handleUpload = async (file: File) => {
    if (tab === "video" && file.size > MAX_VIDEO_AUDIO_BYTES) {
      setError("Video/audio file too large. Max size is 100 MB.");
      return;
    }
    setError(null);
    setResultUrl(null);
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/assets/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      setAssets([data as UploadedAsset]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadMany = async (files: FileList) => {
    setError(null);
    setResultUrl(null);
    setIsUploading(true);
    try {
      const next: UploadedAsset[] = [];
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/assets/upload", {
          method: "POST",
          body: form,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Upload failed");
        next.push(data as UploadedAsset);
      }
      setAssets(next);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConvert = async () => {
    if (!primaryAsset) return;
    setError(null);
    setResultUrl(null);
    setIsConverting(true);

    try {
      let body: any = { assetId: primaryAsset.assetId, kind };

      if (kind === "image_format") {
        body = { ...body, targetFormat: imageFormat, quality: "auto" };
      }
      if (kind === "images_to_pdf") {
        body = { kind, assetIds: assets.map((a) => a.assetId), quality: "auto" };
      }
      if (kind === "pdf_to_image") {
        body = {
          ...body,
          targetFormat: pdfToImageFormat,
        };
      }
      if (kind === "video_to_audio") {
        body = { ...body, targetFormat: audioFormat };
      }

      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Conversion failed");

      // images_to_pdf returns base64 PDF directly — show preview + download
      if (data?.pdfBase64) {
        if (fileInputRef.current) fileInputRef.current.value = "";
        const raw = atob(data.pdfBase64);
        const arr = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
        const blob = new Blob([arr], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        setPdfBlobUrl(url);
        setResultUrl("pdf-ready");
        return;
      }

      // pdf_to_image returns array of page image URLs
      if (data?.pageUrls) {
        if (fileInputRef.current) fileInputRef.current.value = "";
        setPageImageUrls(data.pageUrls as string[]);
        setResultUrl("pages-ready");
        return;
      }

      if (!data?.resultUrl) throw new Error("Conversion failed");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setResultUrl(String(data.resultUrl));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Conversion failed";
      setError(msg);
    } finally {
      setIsConverting(false);
    }
  };

  const downloadFilename = useMemo(() => {
    const base = primaryAsset?.publicId?.split("/")?.pop() || "cloudmedia";
    if (kind === "image_format") return `${base}.${imageFormat}`;
    if (kind === "images_to_pdf") return `${base}_merged.pdf`;
    if (kind === "pdf_to_image") return `${base}_pages.${pdfToImageFormat}`;
    if (kind === "video_to_audio") return `${base}.${audioFormat}`;
    return `${base}.out`;
  }, [primaryAsset?.publicId, kind, imageFormat, pdfToImageFormat, audioFormat]);

  const canConvert = !!primaryAsset && allowedKinds.includes(kind);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Convert</h1>
          <p className="text-sm opacity-60 mt-1">
            Upload a file, pick a conversion, and download the result.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <div className="badge-soon">Free Tier</div>
          <div className="text-xs opacity-50">Usage meter placeholder</div>
        </div>
      </div>

      <div className="bg-base-200/50 border border-base-300/40 rounded-2xl p-3">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(tabMeta) as TabKey[]).map((key) => {
            const active = tab === key;
            const Icon = tabMeta[key].icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTab(key);
                  setError(null);
                  setResultUrl(null);
                  setPdfBlobUrl(null);
                  setPageImageUrls([]);
                  setAssets([]);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className={`btn btn-sm rounded-xl gap-2 ${
                  active ? "btn-primary" : "btn-ghost"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tabMeta[key].label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: controls */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-base-200/50 border border-base-300/40 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide opacity-50">
              1 &middot; Upload
            </h2>
            <p className="text-sm opacity-60">{uploadHint}</p>

            <input
              type="file"
              accept={uploadAccept}
              multiple={tab === "image" && kind === "images_to_pdf"}
              ref={fileInputRef}
              className="file-input file-input-bordered w-full rounded-xl"
              disabled={isUploading}
              onChange={(e) => {
                const list = e.target.files;
                if (!list || list.length === 0) return;

                const first = list[0];
                if (!first) return;

                if (tab === "image" && kind === "images_to_pdf") {
                  void handleUploadMany(list);
                  return;
                }

                void handleUpload(first);
              }}
            />

            {isUploading && <progress className="progress progress-primary w-full" />}

            {primaryAsset && (
              <div className="bg-base-100 border border-base-300/30 rounded-2xl p-4 text-sm space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="opacity-60">Type</span>
                  <span className="font-semibold">{primaryAsset.resourceType}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="opacity-60">Format</span>
                  <span className="font-semibold">{primaryAsset.originalFormat}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="opacity-60">Size</span>
                  <span className="font-semibold">{formatBytes(primaryAsset.bytes)}</span>
                </div>
                {tab === "image" && assets.length > 1 && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="opacity-60">Images</span>
                    <span className="font-semibold">{assets.length}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-base-200/50 border border-base-300/40 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide opacity-50">
              2 &middot; Choose Conversion
            </h2>

            {allowedKinds.length === 0 ? (
              <div className="text-sm opacity-60">
                {primaryAsset ? (
                  <p>
                    This uploaded file type doesn’t match this tab. Switch tabs
                    and upload again.
                  </p>
                ) : (
                  <p>Upload a file to see available conversions.</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  {allowedKinds.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setKind(k);
                        setError(null);
                        setResultUrl(null);
                        setPdfBlobUrl(null);
                        setPageImageUrls([]);

                        if (k === "image_format" && assets.length > 1) {
                          setAssets((prev) => (prev.length > 0 ? [prev[0]] : []));
                        }
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        kind === k
                          ? "bg-primary text-primary-content"
                          : "hover:bg-base-300/60"
                      }`}
                    >
                      {k === "image_format" && "Image → JPG/PNG/WEBP/AVIF"}
                    {k === "images_to_pdf" && "Image(s) → PDF"}
                      {k === "pdf_to_image" && "PDF → Images (all pages)"}
                      {k === "video_to_audio" && "Video → Audio"}
                    </button>
                  ))}
                </div>

                {kind === "image_format" && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold opacity-60">Output format</label>
                    <select
                      className="select select-bordered w-full rounded-xl"
                      value={imageFormat}
                      onChange={(e) =>
                        setImageFormat(e.target.value as typeof imageFormat)
                      }
                    >
                      <option value="jpg">JPG</option>
                      <option value="png">PNG</option>
                      <option value="webp">WEBP</option>
                      <option value="avif">AVIF</option>
                    </select>
                  </div>
                )}

                {kind === "pdf_to_image" && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold opacity-60">Output format</label>
                    <select
                      className="select select-bordered w-full rounded-xl"
                      value={pdfToImageFormat}
                      onChange={(e) =>
                        setPdfToImageFormat(
                          e.target.value as typeof pdfToImageFormat
                        )
                      }
                    >
                      <option value="jpg">JPG</option>
                      <option value="png">PNG</option>
                      <option value="webp">WEBP</option>
                    </select>
                    <p className="text-xs opacity-50">
                      All pages will be converted automatically.
                    </p>
                  </div>
                )}

                {kind === "video_to_audio" && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold opacity-60">Output format</label>
                    <select
                      className="select select-bordered w-full rounded-xl"
                      value={audioFormat}
                      onChange={(e) =>
                        setAudioFormat(e.target.value as typeof audioFormat)
                      }
                    >
                      <option value="mp3">MP3</option>
                      <option value="wav">WAV</option>
                      <option value="m4a">M4A</option>
                    </select>
                  </div>
                )}

                <button
                  className="btn btn-primary w-full rounded-xl gap-2"
                  onClick={() => void handleConvert()}
                  disabled={!canConvert || isConverting}
                >
                  {isConverting ? "Converting…" : "Convert"}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="alert alert-error rounded-2xl">
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Right: preview + download */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-base-200/50 border border-base-300/40 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide opacity-50">
              Result
            </h2>

            {!resultUrl ? (
              <div className="py-16 text-center text-sm opacity-40">
                Convert a file to see the result preview.
              </div>
            ) : resultUrl === "pdf-ready" && pdfBlobUrl ? (
              <div className="space-y-4">
                <embed
                  src={pdfBlobUrl}
                  type="application/pdf"
                  className="w-full rounded-xl border border-base-300/30"
                  style={{ height: "480px" }}
                />
                <button
                  type="button"
                  className="btn btn-primary w-full rounded-xl gap-2"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = pdfBlobUrl;
                    a.download = downloadFilename;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }}
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              </div>
            ) : resultUrl === "pages-ready" && pageImageUrls.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium opacity-70">
                    {pageImageUrls.length} page{pageImageUrls.length > 1 ? "s" : ""} converted
                  </span>
                  <span className="badge badge-sm badge-primary">
                    {pageImageUrls.length <= 5 ? "Individual download" : "ZIP download"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
                  {pageImageUrls.map((url, i) => (
                    <div
                      key={i}
                      className="relative rounded-xl border border-base-300/30 overflow-hidden bg-base-200/30"
                    >
                      <img
                        src={url}
                        alt={`Page ${i + 1}`}
                        className="w-full object-contain"
                      />
                      <span className="absolute bottom-1 right-1 badge badge-xs badge-neutral">
                        {i + 1}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="btn btn-primary w-full rounded-xl gap-2"
                  disabled={isDownloading}
                  onClick={async () => {
                    setIsDownloading(true);
                    setError(null);
                    try {
                      const ext = pdfToImageFormat || "jpg";
                      if (pageImageUrls.length <= 5) {
                        /* Download each page individually via proxy */
                        for (let i = 0; i < pageImageUrls.length; i++) {
                          await downloadViaProxy(
                            pageImageUrls[i],
                            `page_${i + 1}.${ext}`
                          );
                        }
                      } else {
                        /* Pack into a ZIP */
                        const zip = new JSZip();
                        await Promise.all(
                          pageImageUrls.map(async (url, i) => {
                            const proxyUrl =
                              "/api/download?" +
                              new URLSearchParams({
                                url,
                                filename: `page_${i + 1}.${ext}`,
                              }).toString();
                            const res = await fetch(proxyUrl);
                            if (!res.ok)
                              throw new Error(`Failed to fetch page ${i + 1}`);
                            const blob = await res.blob();
                            zip.file(`page_${i + 1}.${ext}`, blob);
                          })
                        );
                        const zipBlob = await zip.generateAsync({ type: "blob" });
                        downloadBlob(zipBlob, "converted_pages.zip");
                      }
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Download failed"
                      );
                    } finally {
                      setIsDownloading(false);
                    }
                  }}
                >
                  <Download className="w-4 h-4" />
                  {isDownloading
                    ? "Downloading…"
                    : pageImageUrls.length <= 5
                      ? `Download ${pageImageUrls.length} Image${pageImageUrls.length > 1 ? "s" : ""}`
                      : "Download ZIP"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {resultPreviewType === "image" && (
                  <img
                    src={resultUrl}
                    alt="Converted result"
                    className="w-full rounded-xl border border-base-300/30"
                  />
                )}

                {resultPreviewType === "audio" && (
                  <audio controls className="w-full">
                    <source src={resultUrl} />
                  </audio>
                )}

                {resultPreviewType === "file" && (
                  <div className="rounded-xl border border-base-300/30 bg-base-100 p-4 text-sm">
                    <p className="font-semibold">PDF generated</p>
                    <p className="opacity-60 mt-1 break-all">{resultUrl}</p>
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-primary w-full rounded-xl gap-2"
                  disabled={isDownloading}
                  onClick={async () => {
                    setIsDownloading(true);
                    setError(null);
                    try {
                      await downloadViaProxy(resultUrl, downloadFilename);
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Download failed"
                      );
                    } finally {
                      setIsDownloading(false);
                    }
                  }}
                >
                  <Download className="w-4 h-4" />
                  {isDownloading ? "Downloading…" : "Download"}
                </button>
              </div>
            )}
          </div>

          <div className="bg-base-100 border border-base-300/40 rounded-2xl p-6 space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide opacity-50">
              Free Usage
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-base-200/40 border border-base-300/30 rounded-2xl p-4">
                <p className="text-xs opacity-60">Runs used</p>
                <p className="text-lg font-bold">—</p>
              </div>
              <div className="bg-base-200/40 border border-base-300/30 rounded-2xl p-4">
                <p className="text-xs opacity-60">Runs left</p>
                <p className="text-lg font-bold">—</p>
              </div>
            </div>
            <p className="text-xs opacity-50">
              Placeholder for future trial/quota + billing UI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
