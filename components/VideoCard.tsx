import React, { useState, useEffect, useCallback } from "react";
import { getCldImageUrl, getCldVideoUrl } from "next-cloudinary";
import { Download, Clock, FileDown, FileUp } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { filesize } from "filesize";
import { Video } from "@/types";

dayjs.extend(relativeTime);

interface VideoCardProps {
  video: Video;
  onDownload: (url: string, title: string) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onDownload }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const getThumbnailUrl = useCallback(
    (publicId: string) =>
      getCldImageUrl({
        src: publicId,
        width: 400,
        height: 225,
        crop: "fill",
        gravity: "auto",
        format: "jpg",
        quality: "auto",
        assetType: "video",
      }),
    []
  );

  const getFullVideoUrl = useCallback(
    (publicId: string) =>
      getCldVideoUrl({ src: publicId, width: 1920, height: 1080 }),
    []
  );

  const getPreviewVideoUrl = useCallback(
    (publicId: string) =>
      getCldVideoUrl({
        src: publicId,
        width: 400,
        height: 225,
        rawTransformations: [
          "e_preview:duration_15:max_seg_9:min_seg_dur_1",
        ],
      }),
    []
  );

  const formatSize = useCallback(
    (size: number) => filesize(size) as string,
    []
  );

  const formatDuration = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  const compressionPercentage = Math.round(
    (1 - Number(video.compressedSize) / Number(video.originalSize)) * 100
  );

  useEffect(() => {
    setPreviewError(false);
  }, [isHovered]);

  return (
    <div
      className="group bg-base-200/50 border border-base-300/40 rounded-2xl overflow-hidden card-hover"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* thumbnail / preview */}
      <figure className="aspect-video relative bg-base-300/30">
        {isHovered ? (
          previewError ? (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-xs opacity-40">Preview unavailable</p>
            </div>
          ) : (
            <video
              src={getPreviewVideoUrl(video.publicId)}
              autoPlay
              muted
              loop
              className="w-full h-full object-cover"
              onError={() => setPreviewError(true)}
            />
          )
        ) : (
          <img
            src={getThumbnailUrl(video.publicId)}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        )}

        {/* duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-lg text-xs flex items-center gap-1">
          <Clock size={12} />
          {formatDuration(Number(video.duration))}
        </div>
      </figure>

      {/* body */}
      <div className="p-4 space-y-3">
        <div>
          <h2 className="font-semibold text-sm leading-snug line-clamp-1">
            {video.title}
          </h2>
          {video.description && (
            <p className="text-xs opacity-50 mt-0.5 line-clamp-1">
              {video.description}
            </p>
          )}
          <p className="text-[0.65rem] opacity-40 mt-1">
            {dayjs(video.createdAt).fromNow()}
          </p>
        </div>

        {/* size row */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <FileUp size={14} className="text-primary shrink-0" />
            <div>
              <span className="opacity-50">Original</span>
              <p className="font-semibold">
                {formatSize(Number(video.originalSize))}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FileDown size={14} className="text-secondary shrink-0" />
            <div>
              <span className="opacity-50">Compressed</span>
              <p className="font-semibold">
                {formatSize(Number(video.compressedSize))}
              </p>
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between pt-1 border-t border-base-300/30">
          <span className="text-xs font-semibold">
            <span className="opacity-50">Saved </span>
            <span className="text-accent">{compressionPercentage}%</span>
          </span>
          <button
            className="btn btn-primary btn-xs rounded-lg gap-1"
            onClick={() =>
              onDownload(getFullVideoUrl(video.publicId), video.title)
            }
          >
            <Download size={12} />
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;