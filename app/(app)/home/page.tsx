"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import VideoCard from "@/components/VideoCard";
import { Video } from "@/types";
import {
  UploadIcon,
  VideoIcon,
  HardDrive,
  TrendingDown,
} from "lucide-react";
import { filesize } from "filesize";

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    try {
      const response = await axios.get("/api/videos");
      if (Array.isArray(response.data)) {
        setVideos(response.data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.log(error);
      setError("Failed to fetch videos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleDownload = useCallback((url: string, title: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${title}.mp4`);
    link.setAttribute("target", "_blank");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  /* ── Derived stats ───────────────────────────── */
  const totalOriginal = videos.reduce(
    (sum, v) => sum + Number(v.originalSize),
    0
  );
  const totalCompressed = videos.reduce(
    (sum, v) => sum + Number(v.compressedSize),
    0
  );
  const totalSaved = totalOriginal - totalCompressed;

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
        <button className="btn btn-sm btn-outline" onClick={fetchVideos}>
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
            Your private media library &mdash; only you can see these.
          </p>
        </div>
        <Link href="/video-upload" className="btn btn-primary btn-sm rounded-xl gap-2">
          <UploadIcon className="w-4 h-4" /> Upload Video
        </Link>
      </div>

      {/* stat cards */}
      {videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-base-200/60 rounded-2xl p-5 flex items-center gap-4">
            <div className="bg-primary/10 text-primary rounded-xl p-2.5">
              <VideoIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{videos.length}</p>
              <p className="text-xs opacity-50">Videos</p>
            </div>
          </div>
          <div className="bg-base-200/60 rounded-2xl p-5 flex items-center gap-4">
            <div className="bg-secondary/10 text-secondary rounded-xl p-2.5">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {filesize(totalCompressed) as string}
              </p>
              <p className="text-xs opacity-50">Storage Used</p>
            </div>
          </div>
          <div className="bg-base-200/60 rounded-2xl p-5 flex items-center gap-4">
            <div className="bg-accent/10 text-accent rounded-xl p-2.5">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {filesize(totalSaved) as string}
              </p>
              <p className="text-xs opacity-50">Space Saved</p>
            </div>
          </div>
        </div>
      )}

      {/* empty state */}
      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="bg-base-200 rounded-full p-6">
            <VideoIcon className="w-10 h-10 opacity-30" />
          </div>
          <h2 className="text-lg font-semibold">No videos yet</h2>
          <p className="text-sm opacity-50 max-w-sm">
            Upload your first video and CloudMedia will automatically compress
            it for you.
          </p>
          <Link href="/video-upload" className="btn btn-primary btn-sm rounded-xl gap-2 mt-2">
            <UploadIcon className="w-4 h-4" /> Upload Video
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} onDownload={handleDownload} />
          ))}
        </div>
      )}
    </div>
  );
}