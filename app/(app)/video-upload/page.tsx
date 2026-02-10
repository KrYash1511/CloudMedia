"use client";
import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { UploadCloud, FileVideo, Info } from "lucide-react";
import { filesize } from "filesize";

export default function VideoUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const MAX_FILE_SIZE = 70 * 1024 * 1024;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      alert("File size exceeds the maximum limit of 70 MB");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("originalSize", file.size.toString());

    try {
      await axios.post("/api/video-upload", formData);
      router.push("/home");
    } catch (error) {
      console.log(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Video</h1>
        <p className="text-sm opacity-60 mt-1">
          Your video will be compressed automatically after upload.
        </p>
      </div>

      {/* form card */}
      <form
        onSubmit={handleSubmit}
        className="bg-base-200/50 border border-base-300/40 rounded-2xl p-6 sm:p-8 space-y-6"
      >
        {/* title */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My awesome video"
            className="input input-bordered w-full rounded-xl"
            required
          />
        </div>

        {/* description */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a short description…"
            className="textarea textarea-bordered w-full rounded-xl min-h-[80px]"
          />
        </div>

        {/* file drop zone */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Video File</label>
          <label
            className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-colors ${
              file
                ? "border-primary/50 bg-primary/5"
                : "border-base-300 hover:border-primary/40 hover:bg-base-300/30"
            }`}
          >
            {file ? (
              <>
                <FileVideo className="w-8 h-8 text-primary" />
                <div className="text-center">
                  <p className="text-sm font-semibold truncate max-w-xs">
                    {file.name}
                  </p>
                  <p className="text-xs opacity-50 mt-0.5">
                    {filesize(file.size) as string}
                  </p>
                </div>
              </>
            ) : (
              <>
                <UploadCloud className="w-8 h-8 opacity-30" />
                <p className="text-sm opacity-50">
                  Click to choose a video file
                </p>
              </>
            )}
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              required
            />
          </label>
        </div>

        {/* info badge */}
        <div className="flex items-start gap-2 text-xs opacity-50">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Max file size 70 MB. Supported formats: MP4, MOV, WebM, AVI and
            more.
          </span>
        </div>

        {/* upload progress */}
        {isUploading && (
          <div className="space-y-2">
            <progress className="progress progress-primary w-full" />
            <p className="text-xs text-center opacity-60">
              Uploading &amp; compressing — this may take a moment…
            </p>
          </div>
        )}

        {/* submit */}
        <button
          type="submit"
          className="btn btn-primary w-full rounded-xl gap-2"
          disabled={isUploading || !file}
        >
          {isUploading ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              Uploading…
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4" />
              Upload &amp; Compress
            </>
          )}
        </button>
      </form>
    </div>
  );
}