import { useState, useRef, useEffect, useCallback } from "react";
import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useMoments } from "@/lib/moment-store";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { X, Heart, Send, Download, Volume2, VolumeX, Check, BarChart2 } from "lucide-react";
import { downloadMomentMedia } from "@/lib/yw-download";
import { toast } from "sonner";

// ⏱️ REAL 40 SECONDS DURATION CHUNKING
const SEGMENT_DURATION = 40;

export const Route = createFileRoute("/moment/$momentId")({
  head: () => ({
    meta: [
      { title: "Moment — YourWorld" },
      { name: "description", content: "Watch this moment on YourWorld with Snapchat-style segmented playback." },
      { property: "og:title", content: "Moment — YourWorld" },
      { property: "og:description", content: "Watch this moment on YourWorld." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MomentViewRoute,
});

function MomentViewRoute() {
  const { momentId } = useParams({ strict: false });
  const navigate = useNavigate();
  const { moments } = useMoments();

  const momentIndex = moments.findIndex((m) => String(m.id) === String(momentId));
  const currentMoment = momentIndex !== -1 ? moments[momentIndex] : moments[0];

  const [segmentIndex, setSegmentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [pollVotedOption, setPollVotedOption] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const totalDuration = currentMoment?.duration || 40;
  const totalSegments = currentMoment?.kind === "video" 
    ? Math.max(1, Math.ceil(totalDuration / SEGMENT_DURATION)) 
    : 1;

  const close = useCallback(() => {
    navigate({ to: "/" });
  }, [navigate]);

  const handleNext = useCallback(() => {
    if (segmentIndex < totalSegments - 1) {
      const nextSeg = segmentIndex + 1;
      setSegmentIndex(nextSeg);
      setProgress(0);
      if (videoRef.current) {
        videoRef.current.currentTime = nextSeg * SEGMENT_DURATION;
      }
    } else if (momentIndex !== -1 && momentIndex < moments.length - 1) {
      const nextMoment = moments[momentIndex + 1];
      setSegmentIndex(0);
      setProgress(0);
      navigate({ to: `/moment/${nextMoment.id}` });
    } else {
      close();
    }
  }, [segmentIndex, totalSegments, momentIndex, moments, navigate, close]);

  const handlePrev = useCallback(() => {
    if (segmentIndex > 0) {
      const prevSeg = segmentIndex - 1;
      setSegmentIndex(prevSeg);
      setProgress(0);
      if (videoRef.current) {
        videoRef.current.currentTime = prevSeg * SEGMENT_DURATION;
      }
    } else if (momentIndex > 0) {
      const prevMoment = moments[momentIndex - 1];
      setSegmentIndex(0);
      setProgress(0);
      navigate({ to: `/moment/${prevMoment.id}` });
    }
  }, [segmentIndex, momentIndex, moments, navigate]);

  const handleTimeUpdate = () => {
    if (!videoRef.current || isPaused) return;
    const currentTime = videoRef.current.currentTime;
    const segmentStartTime = segmentIndex * SEGMENT_DURATION;
    const segmentEndTime = Math.min(segmentStartTime + SEGMENT_DURATION, totalDuration);
    
    const currentSegmentProgress = ((currentTime - segmentStartTime) / (segmentEndTime - segmentStartTime)) * 100;
    setProgress(Math.min(100, Math.max(0, currentSegmentProgress)));

    if (currentTime >= segmentEndTime) {
      handleNext();
    }
  };

  useEffect(() => {
    if (videoRef.current && currentMoment?.kind === "video") {
      videoRef.current.currentTime = segmentIndex * SEGMENT_DURATION;
      videoRef.current.play().catch(() => {});
    }
  }, [segmentIndex, momentId, currentMoment]);

  // Photo / text moments: 5-second auto-advance timer
  useEffect(() => {
    if (!currentMoment || currentMoment.kind === "video" || isPaused) return;
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          handleNext();
          return 0;
        }
        return p + 2;
      });
    }, 100);
    return () => clearInterval(id);
  }, [currentMoment, isPaused, handleNext]);

  if (!currentMoment) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black flex items-center justify-center select-none">
      <div className="relative w-full max-w-md h-[94vh] rounded-3xl overflow-hidden bg-black flex items-center justify-center">
        
        {/* SNAPCHAT PROGRESS BARS */}
        <div className={cn("absolute top-3 left-3 right-3 z-[10002] flex gap-1.5 transition-opacity duration-300 pointer-events-none", isPaused ? "opacity-0" : "opacity-100")}>
          {Array.from({ length: totalSegments }).map((_, idx) => (
            <div key={idx} className="h-1 flex-1 bg-white/30 backdrop-blur-sm rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-75 ease-linear rounded-full"
                style={{
                  width: idx < segmentIndex ? "100%" : idx === segmentIndex ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* HEADER */}
        <div className={cn("absolute top-6 left-3 right-3 z-[10002] flex items-center justify-between transition-opacity duration-300", isPaused ? "opacity-0 pointer-events-none" : "opacity-100")}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/50 shadow-md">
              <img src={currentMoment.author?.avatar || "/placeholder.svg"} className="w-full h-full object-cover" alt="" />
            </div>
            <span className="text-sm font-bold text-white drop-shadow-md">
              {currentMoment.author?.name || currentMoment.author?.username || "User"}
            </span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button type="button" onClick={() => setIsMuted(!isMuted)} className="p-2.5 text-white bg-black/60 rounded-full border border-white/20">
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button type="button" onClick={close} className="p-2.5 text-white bg-black/60 rounded-full border border-white/20">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MEDIA */}
        <div className="w-full h-full flex items-center justify-center pointer-events-none">
          {currentMoment.kind === "video" ? (
            <video
              ref={videoRef}
              key={currentMoment.id}
              src={currentMoment.media}
              autoPlay
              playsInline
              muted={isMuted}
              onTimeUpdate={handleTimeUpdate}
              className="w-full h-full object-cover"
            />
          ) : (
            <img key={currentMoment.id} src={currentMoment.media} className="w-full h-full object-cover" alt="" />
          )}
        </div>

        {/* TAP ZONES (30% Left / 70% Right) */}
        <div 
          className="absolute inset-0 z-[10000] flex"
          onMouseDown={() => { setIsPaused(true); videoRef.current?.pause(); }}
          onMouseUp={() => { setIsPaused(false); videoRef.current?.play(); }}
          onTouchStart={() => { setIsPaused(true); videoRef.current?.pause(); }}
          onTouchEnd={() => { setIsPaused(false); videoRef.current?.play(); }}
        >
          <div className="w-[30%] h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
          <div className="w-[70%] h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); handleNext(); }} />
        </div>

      </div>
    </div>
  );
}
