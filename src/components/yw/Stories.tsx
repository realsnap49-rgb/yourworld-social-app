import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { 
  X, Heart, Send, Download, Volume2, VolumeX, Check, BarChart2
} from "lucide-react";
import { useMoments } from "@/lib/moment-store";
import { downloadMomentMedia } from "@/lib/yw-download";
import { toast } from "sonner";

const SEGMENT_DURATION = 20; // 20 seconds per segment

export function Stories() {
  const { moments } = useMoments();
  const [momentIndex, setMomentIndex] = useState<number | null>(null);
  const [segmentIndex, setSegmentIndex] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [replyText, setReplyText] = useState<string>("");
  const [pollVotedOption, setPollVotedOption] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const currentMoment = momentIndex !== null ? moments[momentIndex] : null;

  const totalDuration = currentMoment?.duration || 60; 
  const totalSegments = currentMoment?.kind === "video" 
    ? Math.max(1, Math.ceil(totalDuration / SEGMENT_DURATION)) 
    : 1;

  const close = useCallback(() => {
    setMomentIndex(null);
    setSegmentIndex(0);
    setProgress(0);
    setIsPaused(false);
    setPollVotedOption(null);
  }, []);

  // Instant Next Segment Handler
  const handleNext = useCallback(() => {
    if (segmentIndex < totalSegments - 1) {
      const nextSeg = segmentIndex + 1;
      setSegmentIndex(nextSeg);
      setProgress(0);
      if (videoRef.current) {
        videoRef.current.currentTime = nextSeg * SEGMENT_DURATION;
      }
    } else if (momentIndex !== null && momentIndex < moments.length - 1) {
      setMomentIndex(momentIndex + 1);
      setSegmentIndex(0);
      setProgress(0);
    } else {
      close();
    }
  }, [segmentIndex, totalSegments, momentIndex, moments.length, close]);

  // Instant Previous Segment Handler
  const handlePrev = useCallback(() => {
    if (segmentIndex > 0) {
      const prevSeg = segmentIndex - 1;
      setSegmentIndex(prevSeg);
      setProgress(0);
      if (videoRef.current) {
        videoRef.current.currentTime = prevSeg * SEGMENT_DURATION;
      }
    } else if (momentIndex !== null && momentIndex > 0) {
      setMomentIndex(momentIndex - 1);
      setSegmentIndex(0);
      setProgress(0);
    }
  }, [segmentIndex, momentIndex]);

  // Video Time Update & Segment Tracking
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
  }, [segmentIndex, momentIndex, currentMoment]);

  // Photo Auto-advance (5s)
  useEffect(() => {
    if (currentMoment?.kind === "photo" && !isPaused && momentIndex !== null) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            handleNext();
            return 0;
          }
          return prev + 2;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [currentMoment, isPaused, momentIndex, handleNext]);

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    toast.success("Reply sent successfully!");
    setReplyText("");
  };

  const handleDownload = () => {
    if (currentMoment?.media) {
      downloadMomentMedia(currentMoment.media, `moment-${currentMoment.id}`);
      toast.success("Downloading moment...");
    }
  };

  return (
    <>
      {/* MOMENTS LIST BAR */}
      <div className="flex gap-3 overflow-x-auto p-4 no-scrollbar bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 my-2">
        {moments.map((m, i) => (
          <button
            key={m.id}
            onClick={() => {
              setMomentIndex(i);
              setSegmentIndex(0);
              setProgress(0);
            }}
            className="flex flex-col items-center gap-1.5 shrink-0 group transition-transform active:scale-95"
          >
            <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 shadow-lg shadow-pink-500/20">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-black bg-zinc-900 flex items-center justify-center">
                {m.kind === "video" ? (
                  <video src={m.media} className="w-full h-full object-cover" />
                ) : (
                  <img src={m.media} className="w-full h-full object-cover" alt="" />
                )}
              </div>
            </div>
            <span className="text-xs font-medium text-zinc-300 max-w-[68px] truncate">
              {m.user?.name || "User"}
            </span>
          </button>
        ))}
      </div>

      {/* SNAPCHAT MOMENT PLAYER DIALOG */}
      <Dialog open={momentIndex !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-w-md w-full h-[94vh] p-0 bg-black border-none rounded-3xl overflow-hidden relative flex flex-col justify-center select-none shadow-2xl">
          <DialogTitle className="sr-only">Snapchat Moment Player</DialogTitle>

          {currentMoment && (
            <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
              
              {/* 1. TOP SNAPCHAT PROGRESS BARS */}
              <div className={cn("absolute top-3 left-3 right-3 z-[10001] flex gap-1.5 transition-opacity duration-300 pointer-events-none", isPaused ? "opacity-0" : "opacity-100")}>
                {Array.from({ length: totalSegments }).map((_, idx) => (
                  <div key={idx} className="h-1 flex-1 bg-white/30 backdrop-blur-sm rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-75 ease-linear rounded-full"
                      style={{
                        width:
                          idx < segmentIndex
                            ? "100%"
                            : idx === segmentIndex
                            ? `${progress}%`
                            : "0%",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* 2. HEADER USER INFO & ISOLATED CONTROLS */}
              <div className={cn("absolute top-6 left-3 right-3 z-[10001] flex items-center justify-between transition-opacity duration-300", isPaused ? "opacity-0 pointer-events-none" : "opacity-100")}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/50 shadow-md">
                    <img src={currentMoment.user?.avatar || "/placeholder.svg"} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white drop-shadow-md">
                        {currentMoment.user?.name || "User"}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white font-semibold">
                        {segmentIndex + 1}/{totalSegments}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMuted(!isMuted);
                    }} 
                    className="p-2 text-white bg-black/50 hover:bg-black/70 rounded-full backdrop-blur-md transition-all border border-white/20"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload();
                    }} 
                    className="p-2 text-white bg-black/50 hover:bg-black/70 rounded-full backdrop-blur-md transition-all border border-white/20"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      close();
                    }} 
                    className="p-2 text-white bg-black/50 hover:bg-black/70 rounded-full backdrop-blur-md transition-all border border-white/20"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 3. MEDIA ELEMENT */}
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
                  <img
                    key={currentMoment.id}
                    src={currentMoment.media}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                )}
              </div>

              {/* 4. DEDICATED TAP-TO-SKIP & HOLD TOUCH ZONES */}
              <div 
                className="absolute inset-0 z-[10000] flex"
                onMouseDown={() => { setIsPaused(true); videoRef.current?.pause(); }}
                onMouseUp={() => { setIsPaused(false); videoRef.current?.play(); }}
                onTouchStart={() => { setIsPaused(true); videoRef.current?.pause(); }}
                onTouchEnd={() => { setIsPaused(false); videoRef.current?.play(); }}
              >
                {/* Left 30% Tap Zone - Rewind */}
                <div
                  className="w-[30%] h-full cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handlePrev();
                  }}
                />
                {/* Right 70% Tap Zone - Fast Forward */}
                <div
                  className="w-[70%] h-full cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleNext();
                  }}
                />
              </div>

              {/* 5. POLL OVERLAY */}
              {currentMoment.poll && (
                <div className={cn("absolute bottom-24 left-6 right-6 z-[10001] bg-black/60 backdrop-blur-xl border border-white/20 p-4 rounded-2xl transition-opacity duration-300 pointer-events-auto", isPaused ? "opacity-0 pointer-events-none" : "opacity-100")}>
                  <p className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-pink-400" />
                    {currentMoment.poll.question || "Cast your vote:"}
                  </p>
                  <div className="flex flex-col gap-2">
                    {currentMoment.poll.options?.map((opt: string, oIdx: number) => (
                      <button
                        key={oIdx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPollVotedOption(oIdx);
                        }}
                        className={cn("w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all", 
                          pollVotedOption === oIdx 
                            ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white border-transparent" 
                            : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                        )}
                      >
                        <span>{opt}</span>
                        {pollVotedOption === oIdx && <Check className="w-4 h-4 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. BOTTOM REPLY & LIKE BAR */}
              <div className={cn("absolute bottom-4 left-3 right-3 z-[10001] flex items-center gap-2 transition-opacity duration-300 pointer-events-auto", isPaused ? "opacity-0 pointer-events-none" : "opacity-100")}>
                <div className="flex-1 relative flex items-center">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Send reply..."
                    className="w-full bg-black/60 backdrop-blur-xl border border-white/25 rounded-full pl-4 pr-10 py-2.5 text-sm text-white placeholder-white/60 focus:outline-none focus:border-pink-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendReply();
                    }}
                  />
                  <button onClick={(e) => { e.stopPropagation(); handleSendReply(); }} className="absolute right-2.5 p-1.5 text-pink-400">
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setHasLiked(!hasLiked);
                  }} 
                  className={cn("p-2.5 bg-black/60 backdrop-blur-xl rounded-full text-white border border-white/25 transition-all active:scale-90",
                    hasLiked ? "text-pink-500 border-pink-500/50 bg-pink-500/20" : "hover:bg-white/10"
                  )}
                >
                  <Heart className={cn("w-5 h-5", hasLiked && "fill-pink-500")} />
                </button>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
