import { useState } from "react";
import { useNavigate, createFileRoute } from "@tanstack/react-router";
import {
  X,
  Globe,
  Users,
  Star,
  Lock,
  MessageSquare,
  Heart,
  Zap,
  Download,
  Archive,
  MapPin,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/moment/create")({
  component: MomentCreateScreen,
});

export function MomentCreateScreen() {
  const navigate = useNavigate();

  // State Management
  const [audience, setAudience] = useState<"everyone" | "followers" | "close_friends" | "only_me">("everyone");
  const [duration, setDuration] = useState<"12h" | "24h">("12h");

  // Interaction & Safety Toggles
  const [addPoll, setAddPoll] = useState(false);
  const [allowReactions, setAllowReactions] = useState(true);
  const [allowReplies, setAllowReplies] = useState(true);
  const [screenshotAlert, setScreenshotAlert] = useState(true);
  const [allowDownloads, setAllowDownloads] = useState(true);
  const [saveToArchive, setSaveToArchive] = useState(true);
  const [showLocation, setShowLocation] = useState(false);
  const [allowSharing, setAllowSharing] = useState(true);

  const handleShare = () => {
    toast.success("Moment Shared Successfully!");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 max-w-md mx-auto select-none pb-24">
      {/* HEADER */}
      <div className="flex items-center justify-between py-4">
        <button
          onClick={() => navigate({ to: "/" })}
          className="p-2.5 bg-zinc-900 rounded-full border border-white/10 active:scale-95"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold">Share Moment</h1>
        <div className="w-10" />
      </div>

      {/* MEDIA PREVIEW THUMBNAIL */}
      <div className="flex justify-center my-4">
        <div className="w-36 h-48 rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-zinc-900">
          <img src="/placeholder.svg" alt="Moment Preview" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* AUDIENCE SECTION */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-zinc-400 tracking-wider uppercase mb-3">Audience</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAudience("everyone")}
            className={cn(
              "p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all",
              audience === "everyone" ? "border-pink-500 bg-pink-500/10" : "border-white/10 bg-zinc-900/60",
            )}
          >
            <div className="flex items-center justify-between">
              <Globe className="w-5 h-5 text-pink-400" />
              {audience === "everyone" && <div className="w-2 h-2 rounded-full bg-pink-500" />}
            </div>
            <span className="text-sm font-bold text-white mt-1">Everyone</span>
            <span className="text-[11px] text-zinc-400">Anyone on YourWorld</span>
          </button>

          <button
            type="button"
            onClick={() => setAudience("followers")}
            className={cn(
              "p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all",
              audience === "followers" ? "border-pink-500 bg-pink-500/10" : "border-white/10 bg-zinc-900/60",
            )}
          >
            <Users className="w-5 h-5 text-zinc-400" />
            <span className="text-sm font-bold text-white mt-1">Followers</span>
            <span className="text-[11px] text-zinc-400">People who follow you</span>
          </button>

          <button
            type="button"
            onClick={() => setAudience("close_friends")}
            className={cn(
              "p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all",
              audience === "close_friends" ? "border-pink-500 bg-pink-500/10" : "border-white/10 bg-zinc-900/60",
            )}
          >
            <Star className="w-5 h-5 text-zinc-400" />
            <span className="text-sm font-bold text-white mt-1">Close Friends</span>
            <span className="text-[11px] text-zinc-400">Your green-list</span>
          </button>

          <button
            type="button"
            onClick={() => setAudience("only_me")}
            className={cn(
              "p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all",
              audience === "only_me" ? "border-pink-500 bg-pink-500/10" : "border-white/10 bg-zinc-900/60",
            )}
          >
            <Lock className="w-5 h-5 text-zinc-400" />
            <span className="text-sm font-bold text-white mt-1">Only Me</span>
            <span className="text-[11px] text-zinc-400">Private</span>
          </button>
        </div>
      </div>

      {/* DURATION SECTION */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-zinc-400 tracking-wider uppercase mb-3">Duration</h2>
        <div className="grid grid-cols-2 gap-3 p-1 bg-zinc-900/80 rounded-2xl border border-white/10">
          <button
            type="button"
            onClick={() => setDuration("12h")}
            className={cn(
              "py-3 rounded-xl text-xs font-bold transition-all",
              duration === "12h"
                ? "bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-white border border-pink-500/50"
                : "text-zinc-400",
            )}
          >
            12 Hours
          </button>
          <button
            type="button"
            onClick={() => setDuration("24h")}
            className={cn(
              "py-3 rounded-xl text-xs font-bold transition-all",
              duration === "24h"
                ? "bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-white border border-pink-500/50"
                : "text-zinc-400",
            )}
          >
            24 Hours
          </button>
        </div>
      </div>

      {/* INTERACTION & SAFETY SECTION */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-zinc-400 tracking-wider uppercase mb-3">Interaction & Safety</h2>
        <div className="flex flex-col gap-2.5">
          {/* Add a poll */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-900/60 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800 rounded-xl">
                <MessageSquare className="w-4 h-4 text-zinc-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold">Add a poll</span>
                <span className="text-[10px] text-zinc-400">Let viewers vote</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={addPoll}
              onChange={(e) => setAddPoll(e.target.checked)}
              className="w-5 h-5 accent-pink-500"
            />
          </div>

          {/* Allow reactions */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-900/60 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800 rounded-xl">
                <Heart className="w-4 h-4 text-zinc-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold">Allow reactions</span>
                <span className="text-[10px] text-zinc-400">Viewers can react</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={allowReactions}
              onChange={(e) => setAllowReactions(e.target.checked)}
              className="w-5 h-5 accent-pink-500"
            />
          </div>

          {/* Allow replies */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-900/60 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800 rounded-xl">
                <MessageSquare className="w-4 h-4 text-zinc-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold">Allow replies</span>
                <span className="text-[10px] text-zinc-400">Viewers can reply</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={allowReplies}
              onChange={(e) => setAllowReplies(e.target.checked)}
              className="w-5 h-5 accent-pink-500"
            />
          </div>

          {/* Screenshot alert */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-900/60 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800 rounded-xl">
                <Zap className="w-4 h-4 text-zinc-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold">Screenshot alert</span>
                <span className="text-[10px] text-zinc-400">Best-effort detection</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={screenshotAlert}
              onChange={(e) => setScreenshotAlert(e.target.checked)}
              className="w-5 h-5 accent-pink-500"
            />
          </div>

          {/* Allow downloads */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-900/60 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800 rounded-xl">
                <Download className="w-4 h-4 text-zinc-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold">Allow downloads</span>
                <span className="text-[10px] text-zinc-400">Viewers can save</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={allowDownloads}
              onChange={(e) => setAllowDownloads(e.target.checked)}
              className="w-5 h-5 accent-pink-500"
            />
          </div>

          {/* Save to archive */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-900/60 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800 rounded-xl">
                <Archive className="w-4 h-4 text-zinc-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold">Save to archive</span>
                <span className="text-[10px] text-zinc-400">Keep private copy</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={saveToArchive}
              onChange={(e) => setSaveToArchive(e.target.checked)}
              className="w-5 h-5 accent-pink-500"
            />
          </div>

          {/* Show location */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-900/60 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800 rounded-xl">
                <MapPin className="w-4 h-4 text-zinc-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold">Show location</span>
                <span className="text-[10px] text-zinc-400">Share location</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={showLocation}
              onChange={(e) => setShowLocation(e.target.checked)}
              className="w-5 h-5 accent-pink-500"
            />
          </div>

          {/* Allow sharing */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-900/60 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800 rounded-xl">
                <Share2 className="w-4 h-4 text-zinc-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold">Allow sharing</span>
                <span className="text-[10px] text-zinc-400">Let viewers share</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={allowSharing}
              onChange={(e) => setAllowSharing(e.target.checked)}
              className="w-5 h-5 accent-pink-500"
            />
          </div>
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-xl border-t border-white/10 flex items-center gap-3 max-w-md mx-auto z-50">
        <button
          type="button"
          onClick={() => toast.success("Saved to gallery")}
          className="p-3.5 bg-zinc-900 rounded-full border border-white/20 active:scale-90"
        >
          <Download className="w-5 h-5 text-white" />
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="flex-1 py-3.5 px-6 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg active:scale-98"
        >
          <span>Share Moment</span>
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
