"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactCrop, {
  type PercentCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { getCldImageUrl } from "next-cloudinary";
import {
  Download,
  ImageUp,
  Move,
  RotateCcw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { authFetch } from "@/lib/api-client";

const CUSTOM_KEY = "Custom (free size)" as const;

const socialFormats = {
  // Instagram
  "Instagram Square (1:1)": { width: 1080, height: 1080 },
  "Instagram Portrait (4:5)": { width: 1080, height: 1350 },
  "Instagram Story (9:16)": { width: 1080, height: 1920 },

  // X / Twitter
  "X / Twitter Post (16:9)": { width: 1200, height: 675 },
  "X / Twitter Square (1:1)": { width: 1200, height: 1200 },
  "X / Twitter Header (3:1)": { width: 1500, height: 500 },

  // Facebook
  "Facebook Post (1.91:1)": { width: 1200, height: 628 },
  "Facebook Cover (205:78)": { width: 820, height: 312 },
  "Facebook Story (9:16)": { width: 1080, height: 1920 },

  // LinkedIn
  "LinkedIn Post (1.91:1)": { width: 1200, height: 628 },
  "LinkedIn Square (1:1)": { width: 1200, height: 1200 },

  // YouTube
  "YouTube Thumbnail (16:9)": { width: 1280, height: 720 },

  // TikTok / Shorts
  "TikTok / Shorts (9:16)": { width: 1080, height: 1920 },

  // Pinterest
  "Pinterest Pin (2:3)": { width: 1000, height: 1500 },

  // Custom
  [CUSTOM_KEY]: { width: 1200, height: 1200 },
} as const;

type SocialFormatKey = keyof typeof socialFormats;

type CropMode = "ai" | "manual";

type PixelArea = { x: number; y: number; width: number; height: number };

type ResizeHistoryItem = {
  publicId: string;
  meta?: { width?: number; height?: number };
  savedAt: string;
};

const HISTORY_KEY = "cm_resize_history";
const HISTORY_LIMIT = 12;

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function percentToPixels(
  crop: PercentCrop,
  naturalWidth: number,
  naturalHeight: number
): PixelArea {
  return {
    x: Math.round((crop.x / 100) * naturalWidth),
    y: Math.round((crop.y / 100) * naturalHeight),
    width: Math.round((crop.width / 100) * naturalWidth),
    height: Math.round((crop.height / 100) * naturalHeight),
  };
}

function makeCenteredAspectCrop(
  naturalWidth: number,
  naturalHeight: number,
  aspect: number
): PercentCrop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, naturalWidth, naturalHeight),
    naturalWidth,
    naturalHeight
  );
}

function makeCenteredFreeCrop(): PercentCrop {
  return {
    unit: "%",
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  };
}

export default function ResizeImage() {
  const router = useRouter();

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedMeta, setUploadedMeta] = useState<{
    width?: number;
    height?: number;
  } | null>(null);

  const [history, setHistory] = useState<ResizeHistoryItem[]>([]);

  const [selectedFormat, setSelectedFormat] =
    useState<SocialFormatKey>("Instagram Square (1:1)");

  const [customWidth, setCustomWidth] = useState(1200);
  const [customHeight, setCustomHeight] = useState(1200);

  const [isUploading, setIsUploading] = useState(false);
  const [mode, setMode] = useState<CropMode>("ai");

  const imgRef = useRef<HTMLImageElement | null>(null);
  const lastFormatRef = useRef<SocialFormatKey | null>(null);
  const [manualCrop, setManualCrop] = useState<PercentCrop | undefined>(undefined);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelArea | null>(null);

  const isCustom = selectedFormat === CUSTOM_KEY;

  const outputSize = useMemo(() => {
    if (isCustom) {
      return {
        width: clampInt(customWidth || 0, 64, 4000),
        height: clampInt(customHeight || 0, 64, 4000),
      };
    }
    return socialFormats[selectedFormat];
  }, [isCustom, selectedFormat, customWidth, customHeight]);

  const aspectRatio = useMemo(() => {
    const { width, height } = outputSize;
    return width > 0 && height > 0 ? width / height : 1;
  }, [outputSize]);

  const basePreviewUrl = useMemo(() => {
    if (!uploadedImage) return null;
    return getCldImageUrl({
      src: uploadedImage,
      quality: "auto",
      format: "auto",
    });
  }, [uploadedImage]);

  const originalUrl = useMemo(() => {
    if (!uploadedImage) return null;
    return getCldImageUrl({
      src: uploadedImage,
      width: 1400,
      crop: "limit",
      quality: "auto",
      format: "auto",
    });
  }, [uploadedImage]);

  const aiUrl = useMemo(() => {
    if (!uploadedImage) return null;
    const { width, height } = outputSize;
    return getCldImageUrl({
      src: uploadedImage,
      width,
      height,
      crop: "fill",
      gravity: "auto",
      quality: "auto",
      format: "png",
    });
  }, [uploadedImage, outputSize]);

  const manualUrl = useMemo(() => {
    if (!uploadedImage || !croppedAreaPixels) return null;
    const { width, height } = outputSize;

    const x = clampInt(croppedAreaPixels.x, 0, Number.MAX_SAFE_INTEGER);
    const y = clampInt(croppedAreaPixels.y, 0, Number.MAX_SAFE_INTEGER);
    const w = clampInt(croppedAreaPixels.width, 1, Number.MAX_SAFE_INTEGER);
    const h = clampInt(croppedAreaPixels.height, 1, Number.MAX_SAFE_INTEGER);

    return getCldImageUrl({
      src: uploadedImage,
      rawTransformations: [
        `c_crop,w_${w},h_${h},x_${x},y_${y}`,
        `c_fill,w_${width},h_${height},g_center`,
        "f_png",
        "q_auto",
      ],
    });
  }, [uploadedImage, croppedAreaPixels, outputSize]);

  const activeUrl = mode === "manual" ? manualUrl ?? aiUrl : aiUrl;

  const initManualCropIfPossible = useCallback(() => {
    if (mode !== "manual") return;
    if (manualCrop) return;
    const img = imgRef.current;
    if (!img) return;

    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    if (!naturalWidth || !naturalHeight) return;

    const initial = isCustom
      ? makeCenteredFreeCrop()
      : makeCenteredAspectCrop(naturalWidth, naturalHeight, aspectRatio);
    setManualCrop(initial);
    setCroppedAreaPixels(percentToPixels(initial, naturalWidth, naturalHeight));
  }, [mode, manualCrop, isCustom, aspectRatio]);

  // Key requirement: when switching platform while in manual mode,
  // crop box should already be visible (no dragging needed).
  // For Custom size, we do NOT reset crop on width/height changes.
  useEffect(() => {
    if (mode !== "manual") return;

    const formatChanged = lastFormatRef.current !== selectedFormat;
    if (formatChanged) {
      lastFormatRef.current = selectedFormat;
      setManualCrop(undefined);
      setCroppedAreaPixels(null);
    }

    initManualCropIfPossible();
  }, [mode, selectedFormat, initManualCropIfPossible]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await authFetch("/api/image-upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      setUploadedImage(data.publicId);
      setUploadedMeta({ width: data.width, height: data.height });

      // Default to AI for new uploads
      setMode("ai");
      setManualCrop(undefined);
      setCroppedAreaPixels(null);
    } catch (error) {
      console.error(error);
      alert("Image upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!activeUrl) return;

    try {
      const r = await fetch(activeUrl);
      const blob = await r.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const filenameBase = isCustom
        ? `custom_${outputSize.width}x${outputSize.height}`
        : selectedFormat;

      link.download = filenameBase.replace(/\s/g, "_").toLowerCase() + ".png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Requirement: after download, clear the current upload (fresh page)
      // but keep a clickable history below.
      if (uploadedImage) {
        const newItem: ResizeHistoryItem = {
          publicId: uploadedImage,
          meta: uploadedMeta ?? undefined,
          savedAt: new Date().toISOString(),
        };

        const nextHistory = [
          newItem,
          ...history.filter((h) => h.publicId !== uploadedImage),
        ].slice(0, HISTORY_LIMIT);

        setHistory(nextHistory);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
      }

      // Clear current UI state immediately
      setUploadedImage(null);
      setUploadedMeta(null);
      setMode("ai");
      setManualCrop(undefined);
      setCroppedAreaPixels(null);

      // Hard refresh so the page feels fully cleared.
      setTimeout(() => {
        window.location.reload();
      }, 350);
    } catch (e) {
      console.error(e);
      alert("Download failed. Please try again.");
    }
  };

  const resetManual = () => {
    setManualCrop(undefined);
    setCroppedAreaPixels(null);
    // will re-init immediately if possible
    initManualCropIfPossible();
  };

  useEffect(() => {
    // Load history on mount. (Do NOT restore the current uploaded image.)
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const cleaned: ResizeHistoryItem[] = parsed
        .filter((x) => x && typeof x.publicId === "string")
        .map((x) => ({
          publicId: String(x.publicId),
          meta:
            x.meta && typeof x.meta === "object"
              ? {
                  width:
                    typeof x.meta.width === "number" ? x.meta.width : undefined,
                  height:
                    typeof x.meta.height === "number" ? x.meta.height : undefined,
                }
              : undefined,
          savedAt: typeof x.savedAt === "string" ? x.savedAt : "",
        }))
        .filter((x) => x.publicId.length > 0)
        .slice(0, HISTORY_LIMIT);

      setHistory(cleaned);
    } catch {
      // ignore corrupt storage
    }
  }, []);

  const handleUseHistory = (item: ResizeHistoryItem) => {
    setUploadedImage(item.publicId);
    setUploadedMeta(item.meta ?? null);
    setMode("ai");
    setManualCrop(undefined);
    setCroppedAreaPixels(null);
    router.refresh();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resize Image</h1>
        <p className="text-sm opacity-60 mt-1">
          AI smart-crop is default. Switch to manual to override.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload */}
          <div className="bg-base-200/50 border border-base-300/40 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide opacity-50">
              1 &middot; Upload Image
            </h2>
            <label
              className={`flex flex-col items-center gap-3 border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-colors ${
                uploadedImage
                  ? "border-primary/50 bg-primary/5"
                  : "border-base-300 hover:border-primary/40 hover:bg-base-300/30"
              }`}
            >
              <ImageUp
                className={`w-8 h-8 ${
                  uploadedImage ? "text-primary" : "opacity-30"
                }`}
              />
              <p className="text-sm opacity-50">
                {uploadedImage
                  ? "Image uploaded — click to replace"
                  : "Click to choose an image"}
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {isUploading && (
              <progress className="progress progress-primary w-full" />
            )}
          </div>

          {/* Format selector */}
          {uploadedImage && (
            <div className="bg-base-200/50 border border-base-300/40 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide opacity-50">
                2 &middot; Choose Platform Size
              </h2>

              <div className="space-y-2 max-h-[280px] overflow-auto pr-1">
                {Object.keys(socialFormats).map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => setSelectedFormat(format as SocialFormatKey)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      selectedFormat === format
                        ? "bg-primary text-primary-content"
                        : "hover:bg-base-300/60"
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>

              <div className="text-xs opacity-60">
                Output: <span className="font-semibold">{outputSize.width}×{outputSize.height}</span>
              </div>

              {isCustom && (
                <div className="pt-3 space-y-2">
                  <div className="section-divider" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold opacity-60">
                        Width (px)
                      </label>
                      <input
                        type="number"
                        min={64}
                        max={4000}
                        value={customWidth}
                        onChange={(e) => setCustomWidth(Number(e.target.value))}
                        className="input input-bordered input-sm w-full rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold opacity-60">
                        Height (px)
                      </label>
                      <input
                        type="number"
                        min={64}
                        max={4000}
                        value={customHeight}
                        onChange={(e) => setCustomHeight(Number(e.target.value))}
                        className="input input-bordered input-sm w-full rounded-xl"
                      />
                    </div>
                  </div>
                  <p className="text-xs opacity-50">
                    Custom exports use the aspect ratio of your width/height.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Crop mode */}
          {uploadedImage && (
            <div className="bg-base-200/50 border border-base-300/40 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide opacity-50">
                3 &middot; Crop Mode
              </h2>

              <div className="join w-full">
                <button
                  type="button"
                  className={`btn btn-sm join-item flex-1 rounded-l-xl gap-2 ${
                    mode === "ai" ? "btn-primary" : "btn-ghost"
                  }`}
                  onClick={() => setMode("ai")}
                >
                  <Wand2 className="w-4 h-4" />
                  AI Smart Crop
                </button>
                <button
                  type="button"
                  className={`btn btn-sm join-item flex-1 rounded-r-xl gap-2 ${
                    mode === "manual" ? "btn-primary" : "btn-ghost"
                  }`}
                  onClick={() => {
                    setMode("manual");
                    // ensure crop box appears immediately
                    setTimeout(initManualCropIfPossible, 0);
                  }}
                >
                  <Move className="w-4 h-4" />
                  Manual Adjust
                </button>
              </div>

              <p className="text-xs opacity-60">
                AI uses Cloudinary gravity <span className="font-semibold">auto</span>.
                Manual lets you drag + resize the crop area.
              </p>

              {mode === "manual" && (
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost rounded-lg gap-2"
                    onClick={resetManual}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset crop
                  </button>
                  <span className="text-[0.7rem] opacity-50">
                    Crop box auto-shows on platform switch
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: preview */}
        <div className="lg:col-span-3">
          {!uploadedImage ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-3 bg-base-200/30 rounded-2xl border border-base-300/30">
              <Sparkles className="w-8 h-8 opacity-20" />
              <p className="text-sm opacity-40">
                Upload an image to see the preview here.
              </p>
            </div>
          ) : (
            <div className="bg-base-200/50 border border-base-300/40 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide opacity-50">
                Preview
              </h2>

              {mode === "manual" ? (
                <div className="space-y-4">
                  <div className="relative w-full overflow-hidden rounded-xl border border-base-300/30 bg-base-100">
                    {basePreviewUrl && (
                      <ReactCrop
                        crop={manualCrop}
                        aspect={isCustom ? undefined : aspectRatio}
                        ruleOfThirds
                        keepSelection
                        onChange={(_, percentCrop) => {
                          setManualCrop(percentCrop);
                          const el = imgRef.current;
                          if (!el) return;
                          setCroppedAreaPixels(
                            percentToPixels(
                              percentCrop,
                              el.naturalWidth,
                              el.naturalHeight
                            )
                          );
                        }}
                      >
                        <img
                          ref={imgRef}
                          src={basePreviewUrl}
                          alt="Source"
                          className="max-h-[420px] w-full object-contain"
                          onLoad={() => {
                            // When the image becomes available, initialize crop.
                            initManualCropIfPossible();
                          }}
                        />
                      </ReactCrop>
                    )}
                  </div>

                  <div className="text-xs opacity-60">
                    {uploadedMeta?.width && uploadedMeta?.height ? (
                      <span>
                        Source: {uploadedMeta.width}×{uploadedMeta.height}
                      </span>
                    ) : (
                      <span>Tip: upload returns source dimensions for accuracy.</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative flex justify-center">
                  {aiUrl && (
                    <img
                      src={aiUrl}
                      alt="AI cropped preview"
                      className="rounded-xl max-h-[500px] w-auto"
                    />
                  )}
                </div>
              )}

              <button
                className="btn btn-primary w-full rounded-xl gap-2"
                onClick={handleDownload}
                disabled={!activeUrl}
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          )}
        </div>
      </div>

      {/* History section */}
      {history.length > 0 && (
        <div className="space-y-3">
          <div className="section-divider" />
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide opacity-50">
                History
              </h2>
              <p className="text-xs opacity-50 mt-1">
                Click an image to load it again.
              </p>
            </div>
            <div className="text-xs opacity-50 text-right">
              Showing last {Math.min(history.length, HISTORY_LIMIT)}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {history.map((item) => {
              const thumbUrl = getCldImageUrl({
                src: item.publicId,
                width: 480,
                height: 320,
                crop: "fill",
                gravity: "auto",
                quality: "auto",
                format: "auto",
              });
              return (
                <button
                  key={item.publicId}
                  type="button"
                  onClick={() => handleUseHistory(item)}
                  className="group text-left"
                  title="Use this image"
                >
                  <div className="bg-base-200/40 border border-base-300/30 rounded-2xl p-2 transition-colors group-hover:bg-base-300/40">
                    <img
                      src={thumbUrl}
                      alt="History item"
                      className="w-full aspect-[3/2] object-cover rounded-xl border border-base-300/30"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
