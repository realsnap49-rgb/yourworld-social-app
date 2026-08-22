import React, { useRef, useState } from "react";
import { Play, Eye, Heart, Clock } from "lucide-react";
import { formatDuration, formatViews, timeAgo, type LongVideo } from "@/lib/video-data";
import { resolveMediaUrl } from "@/lib/social-data";

type Props = {
  video: LongVideo;
  onView: (id: string) => void;
  onLike: (id: string) => void;
};

/** Feed card for long-form videos — supports 16:9 and 9:16 playback. */
export function LongVideoCard({ video, onView, onLike }: Props) {
  const [playing, setPlaying] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const counted = useRef(false);

  const start = async () => {
    const url = await resolveMediaUrl(video.mediaUrl, "reels");
    setSrc(url);
    setPlaying(true);
    if (!counted.current) {
      counted.current = true;
      onView(video.id);
    }
  };

  const upcoming =
    !!video.scheduledAt && new Date(video.scheduledAt).getTime() > Date.now();

  return (
    <article className="space-y-3 overflow-hidden rounded-3xl border border-zinc-800/80 bg-[#141418] p-1.5 shadow-2xl">
      <div
        className={`relative w-full overflow-hidden rounded-2xl bg-black ${
          video.orientation === "portrait" ? "aspect-[9/16]" : "aspect-video"
        }`}
      >
        {playing && src ? (
          <video
            src={src}
            controls
            autoPlay
            playsInline
            className="h-full w-full object-contain"
          />
        ) : (
          <button
            onClick={start}
            aria-label={`Play ${video.title}`}
            className="group relative h-full w-full"
          >
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-zinc-800 to-zinc-900" />
            )}
            <span className="absolute inset-0 grid place-items-center bg-black/25">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90 text-black transition-transform group-active:scale-90">
                <Play size={22} className="ml-0.5 fill-black" />
              </span>
            </span>
            <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold">
              {formatDuration(video.durationSeconds)}
            </span>
          </button>
        )}
      </div>

      <div className="space-y-2 px-3 pb-3">
        <h3 className="text-sm font-bold leading-snug text-white">{video.title}</h3>

        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#8b2fc9] text-[11px] font-bold text-white">
            {video.author.letter}
          </span>
          <span className="font-semibold text-zinc-200">@{video.author.username}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Eye size={12} /> {formatViews(video.views)}
          </span>
          <span>·</span>
          <span>{timeAgo(video.createdAt)}</span>
        </div>

        {upcoming && (
          <p className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-400">
            <Clock size={12} /> Scheduled for{" "}
            {new Date(video.scheduledAt as string).toLocaleString()}
          </p>
        )}

        {video.caption && (
          <p className="line-clamp-2 text-xs leading-relaxed text-zinc-300">{video.caption}</p>
        )}

        {video.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {video.hashtags.map((t) => (
              <span key={t} className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400">
                {t}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={() => onLike(video.id)}
          className="flex items-center gap-1.5 pt-1 text-xs text-zinc-300 active:scale-90"
        >
          <Heart
            size={18}
            className={video.likedByMe ? "fill-pink-500 text-pink-500" : "text-zinc-300"}
          />
          {video.likeCount}
        </button>
      </div>
    </article>
  );
}
