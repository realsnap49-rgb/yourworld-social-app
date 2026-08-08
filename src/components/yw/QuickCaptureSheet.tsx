import React, { useState } from "react";
import { X, ShieldAlert, Clock, Sparkles, Camera, Eye } from "lucide-react";

export const QuickCaptureSheet: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [duration, setDuration] = useState<"12h" | "24h">("24h");
  const [screenRecordingAlert, setScreenRecordingAlert] = useState<boolean>(true);
  const [screenshotAlert, setScreenshotAlert] = useState<boolean>(true);

  return (
    <div className="flex flex-col h-full bg-black text-white p-4 rounded-t-3xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Sparkles size={18} className="text-pink-500" /> Snapchat Mode Moment
        </h2>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-full bg-zinc-800">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Safety & Duration Options */}
      <div className="space-y-4 bg-zinc-900/90 p-4 rounded-2xl border border-zinc-800">
        {/* Expiry Duration */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold flex items-center gap-2 text-zinc-300">
            <Clock size={15} className="text-pink-400" /> Expiry Duration
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setDuration("12h")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                duration === "12h" ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              12 Hours
            </button>
            <button
              onClick={() => setDuration("24h")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                duration === "24h" ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              24 Hours
            </button>
          </div>
        </div>

        {/* Screenshot Alert */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold flex items-center gap-2 text-zinc-300">
            <Eye size={15} className="text-pink-400" /> Screenshot Alert
          </span>
          <input
            type="checkbox"
            checked={screenshotAlert}
            onChange={(e) => setScreenshotAlert(e.target.checked)}
            className="h-4 w-4 accent-pink-500 rounded"
          />
        </div>

        {/* Screen Recording Alert */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold flex items-center gap-2 text-zinc-300">
            <ShieldAlert size={15} className="text-pink-400" /> Screen Recording Alert
          </span>
          <input
            type="checkbox"
            checked={screenRecordingAlert}
            onChange={(e) => setScreenRecordingAlert(e.target.checked)}
            className="h-4 w-4 accent-pink-500 rounded"
          />
        </div>
      </div>
    </div>
  );
};
