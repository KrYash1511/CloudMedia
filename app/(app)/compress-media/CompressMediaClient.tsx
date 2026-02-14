"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, Sparkles } from "lucide-react";
import { authFetch, authHeaders } from "@/lib/api-client";

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
  const headers = await authHeaders();
  const res = await fetch(proxyUrl, { headers });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  downloadBlob(blob, filename);
}

export default function CompressMediaClient() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  type MediaKind = "photo" | "pdf" | "video";
  const [mediaKind, setMediaKind] = useState<MediaKind>("photo");

  const [asset, setAsset] = useState<UploadedAsset | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [useTargetSize, setUseTargetSize] = useState(true);
  const [targetUnit, setTargetUnit] = useState<"mb" | "kb">("mb");
  const [targetValue, setTargetValue] = useState<number>(5);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [beforeBytes, setBeforeBytes] = useState<number | null>(null);
  const [afterBytes, setAfterBytes] = useState<number | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultFormat, setResultFormat] = useState<string | null>(null);
  const [resultResourceType, setResultResourceType] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const previewType = useMemo<"image" | "video" | "pdf" | "none">(() => {
    if (!resultUrl) return "none";
    // Use the format/resourceType returned from the compress API
    if (resultResourceType === "video") return "video";
    if (resultFormat === "pdf" || resultUrl.endsWith(".pdf")) return "pdf";
    if (asset?.resourceType === "video") return "video";
    if (asset?.originalFormat === "pdf") return "pdf";
    return "image";
  }, [asset, resultUrl, resultFormat, resultResourceType]);

  const uploadAccept = useMemo(() => {
    if (mediaKind === "photo") return "image/*";
    if (mediaKind === "pdf") return "application/pdf";
    return "video/*";
  }, [mediaKind]);

  const downloadName = useMemo(() => {
    const base = asset?.publicId?.split("/")?.pop() || "compressed";
    const ext = resultFormat || asset?.originalFormat || "bin";
    return `${base}.${ext}`;
  }, [asset?.publicId, asset?.originalFormat, resultFormat]);

  const MAX_VIDEO_MB = 100;

  const handleUpload = async (file: File) => {
    if (mediaKind === "photo" && !file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (mediaKind === "pdf" && file.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (mediaKind === "video" && !file.type.startsWith("video/")) {
      setError("Please choose a video file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (mediaKind === "video" && file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setError(`Video file is too large (${formatBytes(file.size)}). Maximum allowed size is ${MAX_VIDEO_MB} MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    setError(null);
    setResultUrl(null);
    setWarning(null);
    setBeforeBytes(null);
    setAfterBytes(null);
    setPdfFile(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await authFetch("/api/assets/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      setAsset(data as UploadedAsset);
      setBeforeBytes((data as UploadedAsset).bytes);
      // Keep the raw PDF file for Ghostscript compression
      if (mediaKind === "pdf") setPdfFile(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCompress = async () => {
    if (!asset) return;

    // Client-side validation: target size must be less than original
    if (useTargetSize && asset.bytes > 0) {
      const targetInBytes =
        targetUnit === "kb" ? targetValue * 1024 : targetValue * 1024 * 1024;
      if (targetInBytes >= asset.bytes) {
        setError(
          `Target size must be smaller than the original file size (${formatBytes(asset.bytes)}).`
        );
        return;
      }
    }

    setIsCompressing(true);
    setError(null);
    setWarning(null);
    setResultUrl(null);
    setResultFormat(null);
    setResultResourceType(null);
    try {
      let res: Response;

      if (mediaKind === "pdf" && pdfFile) {
        // PDF: send raw file as FormData so the server can compress with Ghostscript
        const form = new FormData();
        form.append("file", pdfFile);
        form.append("assetId", asset.assetId);
        if (useTargetSize) {
          if (targetUnit === "kb") form.append("targetKb", String(targetValue));
          else form.append("targetMb", String(targetValue));
        }
        res = await authFetch("/api/compress", {
          method: "POST",
          body: form,
        });
      } else {
        // Image / Video: send JSON
        const payload: any = { assetId: asset.assetId };
        if (useTargetSize) {
          if (targetUnit === "kb") payload.targetKb = targetValue;
          else payload.targetMb = targetValue;
        }
        res = await authFetch("/api/compress", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Compression failed");

      // For PDFs: create a blob URL from base64 data for reliable preview/download
      if (data.pdfBase64) {
        const byteChars = atob(data.pdfBase64);
        const byteArray = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteArray[i] = byteChars.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);
        // Revoke previous blob URL if any
        if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(blobUrl);
        setResultUrl(blobUrl);
      } else {
        setResultUrl(String(data.resultUrl));
      }

      setResultFormat(data.format ?? null);
      setResultResourceType(data.resourceType ?? null);
      setBeforeBytes(Number(data.originalBytes ?? beforeBytes ?? 0));
      setAfterBytes(Number(data.bytes ?? 0));
      setWarning(typeof data.warning === "string" ? data.warning : null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compression failed");
    } finally {
      setIsCompressing(false);
    }
  };

  if (!isMounted) {
    return <div className="max-w-6xl mx-auto" suppressHydrationWarning />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compress Media</h1>
        <p className="text-sm opacity-60 mt-1">
          Choose a media type, set a target size (KB/MB), and compress.
        </p>
      </div>

      <div className="bg-base-200/50 border border-base-300/40 rounded-2xl p-3">
        <div className="flex flex-wrap gap-2">
          {([
            { key: "photo", label: "Photo" },
            { key: "pdf", label: "PDF" },
            { key: "video", label: "Video" },
          ] as const).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setMediaKind(item.key);
                setError(null);
                setWarning(null);
                setResultUrl(null);
                setResultFormat(null);
                setResultResourceType(null);
                setBeforeBytes(null);
                setAfterBytes(null);
                setAsset(null);
                setPdfFile(null);
                if (pdfBlobUrl) { URL.revokeObjectURL(pdfBlobUrl); setPdfBlobUrl(null); }
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className={`btn btn-sm rounded-xl ${
                mediaKind === item.key ? "btn-primary" : "btn-ghost"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="alert alert-error rounded-2xl">
          <span className="text-sm">{error}</span>
        </div>
      )}
      {warning && (
        <div className="alert rounded-2xl">
          <span className="text-sm">{warning}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-base-200/50 border border-base-300/40 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide opacity-50">
              1 &middot; Upload
            </h2>

            <input
              ref={fileInputRef}
              type="file"
              accept={uploadAccept}
              className="file-input file-input-bordered w-full rounded-xl"
              disabled={isUploading || isCompressing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f);
              }}
            />
            {mediaKind === "video" && (
              <p className="text-xs opacity-50">
                Max video size: {MAX_VIDEO_MB} MB
              </p>
            )}
            {isUploading && <progress className="progress progress-primary w-full" />}

            {asset && (
              <div className="bg-base-100 border border-base-300/30 rounded-2xl p-4 text-sm space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="opacity-60">Type</span>
                  <span className="font-semibold">{asset.resourceType}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="opacity-60">Format</span>
                  <span className="font-semibold">{asset.originalFormat}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="opacity-60">Size</span>
                  <span className="font-semibold">{formatBytes(asset.bytes)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-base-200/50 border border-base-300/40 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide opacity-50">
              2 &middot; Target Size
            </h2>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={useTargetSize}
                onChange={(e) => setUseTargetSize(e.target.checked)}
                disabled={isCompressing}
              />
              <span className="font-medium">Set target size</span>
            </label>

            <label className="text-xs font-semibold opacity-60">
              Max size ({targetUnit.toUpperCase()})
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={targetUnit === "mb" ? 0.5 : 50}
                max={targetUnit === "mb" ? 100 : 102400}
                step={targetUnit === "mb" ? 0.5 : 50}
                value={Number.isFinite(targetValue) ? targetValue : 5}
                onChange={(e) => setTargetValue(Number(e.target.value))}
                className="input input-bordered w-full rounded-xl"
                disabled={isCompressing || !useTargetSize}
              />
              <select
                className="select select-bordered rounded-xl"
                value={targetUnit}
                disabled={isCompressing || !useTargetSize}
                onChange={(e) => {
                  const next = e.target.value as "mb" | "kb";
                  if (next === targetUnit) return;

                  // Keep the number roughly equivalent when switching units.
                  if (next === "kb") {
                    setTargetValue((v) => Math.max(1, Math.round(v * 1024)));
                  } else {
                    setTargetValue((v) => Math.max(0.5, Number((v / 1024).toFixed(2))));
                  }
                  setTargetUnit(next);
                }}
              >
                <option value="mb">MB</option>
                <option value="kb">KB</option>
              </select>
            </div>

            {!useTargetSize && (
              <p className="text-xs opacity-60">
                Target size is off — compression will use best-quality settings.
              </p>
            )}

            <button
              type="button"
              className="btn btn-primary w-full rounded-xl"
              onClick={() => void handleCompress()}
              disabled={!asset || isCompressing}
            >
              {isCompressing ? "Compressing…" : "Compress"}
            </button>

            {(beforeBytes != null || afterBytes != null) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-base-100 border border-base-300/30 rounded-2xl p-4">
                  <p className="text-xs opacity-60">Before</p>
                  <p className="text-sm font-bold">
                    {beforeBytes != null ? formatBytes(beforeBytes) : "—"}
                  </p>
                </div>
                <div className="bg-base-100 border border-base-300/30 rounded-2xl p-4">
                  <p className="text-xs opacity-60">After</p>
                  <p className="text-sm font-bold">
                    {afterBytes != null ? formatBytes(afterBytes) : "—"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-base-200/50 border border-base-300/40 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide opacity-50">
              Result
            </h2>

            {!resultUrl ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 bg-base-200/30 rounded-2xl border border-base-300/30">
                <Sparkles className="w-8 h-8 opacity-20" />
                <p className="text-sm opacity-40">
                  Compress a file to see the preview here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {previewType === "image" && (
                  <img
                    src={resultUrl}
                    alt="Compressed result"
                    className="w-full rounded-xl border border-base-300/30"
                  />
                )}

                {previewType === "video" && (
                  <video controls className="w-full rounded-xl border border-base-300/30">
                    <source src={resultUrl} />
                  </video>
                )}

                {previewType === "pdf" && (
                  <iframe
                    src={resultUrl}
                    className="w-full rounded-xl border border-base-300/30"
                    style={{ height: "480px" }}
                    title="Compressed PDF preview"
                  />
                )}

                <button
                  type="button"
                  className="btn btn-primary w-full rounded-xl gap-2"
                  disabled={isDownloading}
                  onClick={async () => {
                    if (!resultUrl) return;
                    setIsDownloading(true);
                    setError(null);
                    try {
                      if (pdfBlobUrl && resultUrl === pdfBlobUrl) {
                        // PDF: download directly from blob (no proxy needed)
                        const res = await fetch(pdfBlobUrl);
                        const blob = await res.blob();
                        downloadBlob(blob, downloadName);
                      } else {
                        await downloadViaProxy(resultUrl, downloadName);
                      }
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Download failed");
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
        </div>
      </div>
    </div>
  );
}
