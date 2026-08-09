import React, { useState } from "react";
import { X, ShieldAlert, Clock, Sparkles, Eye, Check, Download, Archive } from "lucide-react";

type MediaEditorProps = {
  onClose?: () => void;
  media?: { url: string; type: string; name?: string };
  kind?: string;
  onBack?: () => void;
  onNext?: () => void;
};

export const MediaEditor: React.FC<MediaEditorProps> = ({ onClose }) => {
  const [privacy, setPrivacy] = useState<"everyone" | "followers" | "close_friends" | "only_me">("everyone");
  const [duration, setDuration] = useState<"12h" | "24h">("24h");
  const [screenshotAlert, setScreenshotAlert] = useState<boolean>(true);
  const [screenRecordingAlert, setScreenRecordingAlert] = useState<boolean>(true);
  const [allowDownloads, setAllowDownloads] = useState<boolean>(true);
  const [saveToArchive, setSaveToArchive] = useState<boolean>(true);
  const [caption, setCaption] = useState<string>("");

  return (
    <div className="flex flex-col h-full bg-black text-white p-5 rounded-t-3xl overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Sparkles size={20} className="text-pink-500" /> Preview & Share
        </h2>
        {onClose && (
          <button onClick={onClose} className="p-2 rounded-full bg-zinc-800 text-zinc-300 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Caption Input */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Caption</label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Say something about this moment..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
          rows={3}
        />
      </div>

      {/* Privacy Selection */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Privacy</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: "everyone", label: "Everyone", desc: "Anyone on YourWorld" },
            { id: "followers", label: "Followers", desc: "People who follow you" },
            { id: "close_friends", label: "Close Friends", desc: "Your green-list only" },
            { id: "only_me", label: "Only Me", desc: "Private to you" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPrivacy(item.id as any)}
              className={`p-3 rounded-xl border text-left transition-all ${
                privacy === item.id
                  ? "bg-pink-950/40 border-pink-500 text-white"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{item.label}</span>
                {privacy === item.id && <Check size={14} className="text-pink-500" />}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Duration Selection */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Duration</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setDuration("12h")}
            className={`py-3 rounded-xl border font-bold text-xs transition-all ${
              duration === "12h"
                ? "bg-pink-950/40 border-pink-500 text-white"
                : "bg-zinc-900 border-zinc-800 text-zinc-400"
            }`}
          >
            12 Hours
          </button>
          <button
            onClick={() => setDuration("24h")}
            className={`py-3 rounded-xl border font-bold text-xs transition-all ${
              duration === "24h"
                ? "bg-pink-950/40 border-pink-500 text-white"
                : "bg-zinc-900 border-zinc-800 text-zinc-400"
            }`}
          >
            24 Hours
          </button>
        </div>
      </div>

      {/* Interaction & Safety */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
          Interaction & Safety
        </label>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
          {/* Screenshot Alert */}
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <Eye size={18} className="text-pink-400" />
              <div>
                <p className="text-xs font-semibold text-white">Screenshot alert</p>
                <p className="text-[10px] text-zinc-500">Tell me when someone captures this moment</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={screenshotAlert}
              onChange={(e) => setScreenshotAlert(e.target.checked)}
              className="h-4 w-4 accent-pink-500 rounded"
            />
          </div>

          {/* Screen Recording Alert */}
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <ShieldAlert size={18} className="text-pink-400" />
              <div>
                <p className="text-xs font-semibold text-white">Screen recording alert</p>
                <p className="text-[10px] text-zinc-500">Notify if someone records the screen</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={screenRecordingAlert}
              onChange={(e) => setScreenRecordingAlert(e.target.checked)}
              className="h-4 w-4 accent-pink-500 rounded"
            />
          </div>

          {/* Allow Downloads */}
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <Download size={18} className="text-pink-400" />
              <div>
                <p className="text-xs font-semibold text-white">Allow downloads</p>
                <p className="text-[10px] text-zinc-500">Viewers can save it with the YW watermark</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={allowDownloads}
              onChange={(e) => setAllowDownloads(e.target.checked)}
              className="h-4 w-4 accent-pink-500 rounded"
            />
          </div>

          {/* Save to Archive */}
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <Archive size={18} className="text-pink-400" />
              <div>
                <p className="text-xs font-semibold text-white">Save to archive</p>
                <p className="text-[10px] text-zinc-500">Keep a private copy after it expires</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={saveToArchive}
              onChange={(e) => setSaveToArchive(e.target.checked)}
              className="h-4 w-4 accent-pink-500 rounded"
            />
          </div>
        </div>
      </div>

      {/* Share Button */}
      <button className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full text-white font-bold text-sm shadow-lg hover:opacity-90 transition-opacity">
        Share moment
      </button>
    </div>
  );
};
