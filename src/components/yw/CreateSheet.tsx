import { useNavigate } from "@tanstack/react-router";
import { ImageIcon, Clapperboard, Radio } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface CreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MODES = [
  {
    mode: "POST" as const,
    label: "Post",
    hint: "Photo or video for your feed",
    icon: ImageIcon,
  },
  {
    mode: "REEL" as const,
    label: "Reel",
    hint: "Short vertical video",
    icon: Clapperboard,
  },
  {
    mode: "LIVE" as const,
    label: "Live",
    hint: "Stream to your world right now",
    icon: Radio,
  },
];

export function CreateSheet({ open, onOpenChange }: CreateSheetProps) {
  const navigate = useNavigate();

  const go = (mode: "POST" | "REEL" | "LIVE") => {
    onOpenChange(false);
    navigate({ to: "/create", search: { mode } });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-border/60 pb-8">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-xl">Create</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {MODES.map(({ mode, label, hint, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => go(mode)}
              className="flex w-full items-center gap-4 rounded-2xl bg-secondary px-4 py-3.5 text-left transition-transform active:scale-[0.98]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-background/60">
                <Icon className="h-5 w-5 text-foreground" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block truncate text-xs text-muted-foreground">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function CreateSheet({ isOpen, onClose }: CreateSheetProps) {
  const [activeTab, setActiveTab] = useState<"post" | "reel" | "live">("reel");
  const [isRecording, setIsRecording] = useState(false);
  const [selectedSpeed, setSelectedSpeed] = useState("1x");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md transition-all">
      <div className="relative w-full max-w-md h-[90vh] sm:h-[85vh] bg-zinc-950 text-white sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl border border-zinc-800">
        
        {/* Top Controls Bar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white backdrop-blur-sm transition"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Top Center: Sound / Audio Selector for Reels */}
          {activeTab === "reel" && (
            <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-700/50 backdrop-blur-md text-xs font-semibold hover:scale-105 transition">
              <Music className="w-3.5 h-3.5 text-pink-500" />
              <span>Add Sound</span>
            </button>
          )}

          <button className="p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white backdrop-blur-sm transition">
            <Zap className="w-5 h-5 text-yellow-400" />
          </button>
        </div>

        {/* Main Viewport / Camera Preview Area */}
        <div className="relative flex-1 bg-zinc-900 flex items-center justify-center overflow-hidden">
          {/* Background Placeholder / Live Camera Feed */}
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 via-zinc-900 to-black flex items-center justify-center text-zinc-500">
            <Camera className="w-16 h-16 opacity-30 animate-pulse" />
          </div>

          {/* Floating CapCut / YouCut Editing Sidebar (Reel Mode Only) */}
          {activeTab === "reel" && (
            <div className="absolute right-3 top-20 z-20 flex flex-col gap-4 bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-white/10">
              <button className="flex flex-col items-center gap-1 text-[10px] text-zinc-200 hover:text-white">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <span>Speed ({selectedSpeed})</span>
              </button>
              <button className="flex flex-col items-center gap-1 text-[10px] text-zinc-200 hover:text-white">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span>Effects</span>
              </button>
              <button className="flex flex-col items-center gap-1 text-[10px] text-zinc-200 hover:text-white">
                <Scissors className="w-5 h-5 text-green-400" />
                <span>Trim/Cut</span>
              </button>
              <button className="flex flex-col items-center gap-1 text-[10px] text-zinc-200 hover:text-white">
                <Type className="w-5 h-5 text-purple-400" />
                <span>Captions</span>
              </button>
              <button className="flex flex-col items-center gap-1 text-[10px] text-zinc-200 hover:text-white">
                <Smile className="w-5 h-5 text-pink-400" />
                <span>Stickers</span>
              </button>
            </div>
          )}

          {/* Live Mode Title Card Overlay */}
          {activeTab === "live" && (
            <div className="z-10 w-4/5 bg-zinc-900/90 border border-zinc-700/50 p-4 rounded-2xl backdrop-blur-lg flex flex-col gap-3 text-center">
              <Radio className="w-10 h-10 text-red-500 mx-auto animate-pulse" />
              <h3 className="text-sm font-bold">Go Live Stream</h3>
              <input 
                type="text" 
                placeholder="Add a title for your stream..." 
                className="w-full bg-zinc-800 text-xs px-3 py-2 rounded-lg text-white outline-none border border-zinc-700 focus:border-red-500"
              />
            </div>
          )}
        </div>

        {/* Bottom Shutter & Controls */}
        <div className="relative z-20 p-6 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col items-center gap-6">
          
          {/* Record / Action Button */}
          <div className="flex items-center justify-between w-full max-w-xs px-4">
            {/* Gallery Upload Button */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:scale-105 transition"
            >
              <ImageIcon className="w-5 h-5 text-zinc-300" />
            </button>
            <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,video/*" />

            {/* Central Main Shutter Button */}
            <button 
              onClick={() => setIsRecording(!isRecording)}
              className="relative flex items-center justify-center w-20 h-20 rounded-full border-4 border-white p-1 hover:scale-105 active:scale-95 transition"
            >
              <span className={`w-full h-full rounded-full transition-all duration-300 ${
                activeTab === "live" 
                  ? "bg-red-600" 
                  : activeTab === "reel" 
                  ? isRecording ? "bg-red-500 rounded-lg scale-75" : "bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500" 
                  : "bg-white"
              }`} />
            </button>

            {/* Flip Camera Toggle */}
            <button className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:scale-105 transition">
              <Video className="w-5 h-5 text-zinc-300" />
            </button>
          </div>

          {/* Mode Selector Tabs (POST | REEL | LIVE) */}
          <div className="flex items-center justify-center gap-6 text-sm font-semibold tracking-wider">
            <button 
              onClick={() => setActiveTab("post")}
              className={`transition-all duration-200 ${activeTab === "post" ? "text-white scale-110 border-b-2 border-white pb-1" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              POST
            </button>
            <button 
              onClick={() => setActiveTab("reel")}
              className={`transition-all duration-200 ${activeTab === "reel" ? "text-white scale-110 border-b-2 border-pink-500 pb-1" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              REEL
            </button>
            <button 
              onClick={() => setActiveTab("live")}
              className={`transition-all duration-200 ${activeTab === "live" ? "text-red-500 scale-110 border-b-2 border-red-500 pb-1" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              LIVE
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
