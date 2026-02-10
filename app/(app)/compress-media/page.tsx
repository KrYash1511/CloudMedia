"use client";
import React, { useState, useEffect } from "react";
import { CldImage } from "next-cloudinary";
import { ImageUp, Download, Sparkles } from "lucide-react";

const socialFormats = {
  "Instagram Square (1:1)": { width: 1080, height: 1080, aspectRatio: "1:1" },
  "Instagram Portrait (4:5)": { width: 1080, height: 1350, aspectRatio: "4:5" },
  "Twitter Post (16:9)": { width: 1200, height: 675, aspectRatio: "16:9" },
  "Twitter Header (3:1)": { width: 1500, height: 500, aspectRatio: "3:1" },
  "Facebook Cover (205:78)": { width: 820, height: 312, aspectRatio: "205:78" },
};

type SocialFormatKey = keyof typeof socialFormats;

export default function SocialShare() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] =
    useState<SocialFormatKey>("Instagram Square (1:1)");
  const [isUploading, setIsUploading] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformedUrl, setTransformedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (uploadedImage) {
      setIsTransforming(true);
      setTransformedUrl(null);
    }
  }, [selectedFormat, uploadedImage]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/image-upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      setUploadedImage(data.publicId);
    } catch (error) {
      console.error(error);
      alert("Image upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = () => {
    if (!transformedUrl) return;
    fetch(transformedUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download =
          `${selectedFormat}`.replace(/\s/g, "_").toLowerCase() + ".png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Social Share</h1>
        <p className="text-sm opacity-60 mt-1">
          Resize images for every social platform in one click.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left column: controls ───────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* upload card */}
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

          {/* format selector */}
          {uploadedImage && (
            <div className="bg-base-200/50 border border-base-300/40 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide opacity-50">
                2 &middot; Choose Format
              </h2>
              <div className="space-y-2">
                {Object.keys(socialFormats).map((format) => (
                  <button
                    key={format}
                    onClick={() =>
                      setSelectedFormat(format as SocialFormatKey)
                    }
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
            </div>
          )}
        </div>

        {/* ── Right column: preview ───────────────── */}
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
              <div className="relative flex justify-center">
                {isTransforming && (
                  <div className="absolute inset-0 flex items-center justify-center bg-base-100/60 z-10 rounded-xl">
                    <span className="loading loading-spinner loading-lg text-primary" />
                  </div>
                )}
                <CldImage
                  width={socialFormats[selectedFormat].width}
                  height={socialFormats[selectedFormat].height}
                  src={uploadedImage}
                  sizes="100vw"
                  alt="transformed image"
                  crop="fill"
                  aspectRatio={socialFormats[selectedFormat].aspectRatio}
                  gravity="auto"
                  className="rounded-xl max-h-[500px] w-auto"
                  onLoad={(e) => {
                    setIsTransforming(false);
                    setTransformedUrl(
                      e.currentTarget.currentSrc || e.currentTarget.src
                    );
                  }}
                />
              </div>
              <button
                className="btn btn-primary w-full rounded-xl gap-2"
                onClick={handleDownload}
                disabled={!transformedUrl}
              >
                <Download className="w-4 h-4" />
                Download for {selectedFormat}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
