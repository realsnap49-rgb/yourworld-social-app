import { useEffect, useState } from "react";
import { resolveMediaUrl } from "@/lib/social-data";
import { cn } from "@/lib/utils";

type Props = {
  thumbnailUrl?: string | null;
  mediaUrl: string;
  alt: string;
  className?: string;
};

/**
 * Shows the custom thumbnail when present, otherwise falls back to the
 * first frame of the video itself (`#t=0.5`) so cards never render blank.
 */
export function VideoPoster({ thumbnailUrl, mediaUrl, alt, className }: Props) {
  const [frameUrl, setFrameUrl] = useState<string | null>(null);

  useEffect(() => {
    if (thumbnailUrl || !mediaUrl) return;
    let alive = true;
    void resolveMediaUrl(mediaUrl, "reels").then((url) => {
      if (alive && url) setFrameUrl(`${url}${url.includes("#") ? "" : "#t=0.5"}`);
    });
    return () => {
      alive = false;
    };
  }, [thumbnailUrl, mediaUrl]);

  if (thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt={alt}
        loading="lazy"
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  if (frameUrl) {
    return (
      <video
        src={frameUrl}
        muted
        playsInline
        preload="metadata"
        aria-label={alt}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  return <div className={cn("h-full w-full bg-gradient-to-br from-zinc-800 to-zinc-900", className)} />;
}
