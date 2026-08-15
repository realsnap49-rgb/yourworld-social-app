import React, { useState, useRef, useEffect, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, Phone, Video, MoreVertical, Image as ImageIcon,
  Mic, Send, Smile, Play, Pause, X, MicOff,
  Pencil, Lock, EyeOff, Clock, Camera, VideoOff, BellOff, UserX, Flag,
  Trash2, CheckCheck, Check
} from "lucide-react";
import { UserWatermark } from "@/components/yw/UserWatermark";
import { useCaptureDetect } from "@/lib/capture-detect";
import { currentUser } from "@/lib/yw-data";
import { useThreadMessages, useThreadPeer } from "@/lib/social-data";
import { useCall } from "@/lib/call-store";

export const Route = createFileRoute("/chat/$threadId")({
  component: ChatThreadPage,
});

type Message = {
  id: string;
  text?: string;
  image?: string;
  audio?: string;
  sender: "me" | "them";
  system?: boolean;
  time: string;
  ts: number;
  local?: boolean;
};

function MenuItem({
  icon, label, onClick, state, danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  state?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-3 ${
        danger ? "text-red-400 hover:bg-red-950/40" : "text-zinc-200 hover:bg-zinc-800/80"
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {state !== undefined && (
        <span className={`h-4 w-7 rounded-full transition-colors ${state ? "bg-purple-600" : "bg-zinc-700"} relative`}>
          <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${state ? "left-3.5" : "left-0.5"}`} />
        </span>
      )}
    </button>
  );
}

export function ChatThreadPage() {
  const navigate = useNavigate();
  const { threadId } = Route.useParams();
  const { startCall } = useCall();
  const {
    messages: dbMessages,
    currentUserId,
    send: sendToDb,
    remove: removeFromDb,
  } = useThreadMessages(threadId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [message, setMessage] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  const setMessages = setLocalMessages;

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const messages = useMemo<Message[]>(() => {
    const fromDb: Message[] = dbMessages.map((m) => ({
      id: m.id,
      text: m.media_type === "text" ? m.content : m.content || undefined,
      image: m.media_type === "image" ? m.media_url ?? undefined : undefined,
      audio: m.media_type === "audio" ? m.media_url ?? undefined : undefined,
      sender: m.sender_id === currentUserId ? "me" : "them",
      system: m.media_type === "system",
      time: fmtTime(m.created_at),
      ts: new Date(m.created_at).getTime(),
    }));
    return [...fromDb, ...localMessages]
      .filter((m) => !hiddenIds.includes(m.id))
      .sort((a, b) => a.ts - b.ts);
  }, [dbMessages, localMessages, hiddenIds, currentUserId]);

  const [showEmojis, setShowEmojis] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionSheetId, setActionSheetId] = useState<string | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Peer identity resolved from the thread (never hardcoded)
  const peer = useThreadPeer(threadId, currentUserId);
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const displayName = nameOverride ?? peer.peerName ?? "";
  const setDisplayName = (n: string) => setNameOverride(n);

  // Chat option states
  const [secretLock, setSecretLock] = useState(false);
  const [viewOnce, setViewOnce] = useState(false);
  const [autoDelete, setAutoDelete] = useState(0); // seconds, 0 = off
  const [screenshotAlert, setScreenshotAlert] = useState(true);
  const [recordingAlert, setRecordingAlert] = useState(true);
  const [muted, setMuted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [reported, setReported] = useState(false);

  const pushSystem = (text: string) =>
    setLocalMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}-${Math.random()}`,
        system: true,
        sender: "me" as const,
        text,
        ts: Date.now(),
        local: true,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

  const startLongPress = (id: string) => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    longPressRef.current = setTimeout(() => setActionSheetId(id), 450);
  };
  const cancelLongPress = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    longPressRef.current = null;
  };
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const deleteIds = (ids: string[]) => {
    setLocalMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
    setHiddenIds((prev) => [...prev, ...ids]);
    void removeFromDb(ids.filter((id) => !id.startsWith("local-")));
    setSelectedIds([]);
  };
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds([]);
  };

  useEffect(() => () => cancelLongPress(), []);

  const EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "😍", "👏", "🙌", "🚀", "💯"];

  const didFirstScroll = useRef(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: didFirstScroll.current ? "smooth" : "auto",
        block: "end",
      });
      didFirstScroll.current = true;
    });
    return () => cancelAnimationFrame(id);
  }, [messages, isRecording]);

  // Screenshot / recording detection posts an in-chat system note for both sides.
  useCaptureDetect(true, (kind) => {
    if (kind === "recording" ? !recordingAlert : !screenshotAlert) return;
    pushSystem(`${currentUser.name} took a ${kind === "recording" ? "recording" : "screenshot"}`);
  });

  // Auto delete messages after the configured window
  useEffect(() => {
    if (!autoDelete) return;
    const t = setInterval(() => {
      const cutoff = Date.now() - autoDelete * 1000;
      setLocalMessages((prev) => prev.filter((m) => m.ts >= cutoff));
    }, 1000);
    return () => clearInterval(t);
  }, [autoDelete]);

  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);


  const pushLocal = (partial: Omit<Message, "id" | "time" | "ts" | "local">) =>
    setLocalMessages((prev) => [
      ...prev,
      {
        ...partial,
        id: `local-${Date.now()}-${Math.random()}`,
        ts: Date.now(),
        local: true,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

  const handleSend = () => {
    if (!message.trim() || blocked) return;
    const currentMsg = message;
    if (currentUserId) {
      void sendToDb({ content: currentMsg, media_type: "text" });
    } else {
      pushLocal({ text: currentMsg, sender: "me" });
    }
    setMessage("");
    setShowEmojis(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const src = event.target.result as string;
          if (currentUserId) {
            void sendToDb({ media_url: src, media_type: "image" });
          } else {
            pushLocal({ image: src, sender: "me" });
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(blob);
        pushLocal({ audio: audioUrl, sender: "me" });
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone error", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white font-sans flex flex-col justify-between overflow-hidden">
      
      <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />

      {/* TOP HEADER */}
      <div className="relative z-[70] flex items-center justify-between px-4 py-3 bg-zinc-950/90 border-b border-zinc-800/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate({ to: ".." })} className="p-1 text-zinc-300 hover:text-white">
            <ArrowLeft size={22} />
          </button>
          
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-md">
              U
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-black rounded-full" />
          </div>

          <div className="flex flex-col">
            <span className="font-bold text-sm leading-tight text-white flex items-center gap-1">
              {displayName}
              {secretLock && <Lock size={12} className="text-purple-400" />}
              {muted && <BellOff size={12} className="text-zinc-500" />}
            </span>
            <span className="text-[11px] text-emerald-400 font-medium">
              {blocked ? <span className="text-red-400">Blocked</span> : "Online"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-zinc-300">
          <button
            onClick={() =>
              void startCall({
                threadId,
                peerId: peer.peerId ?? undefined,
                peerName: displayName,
                mode: "audio",
              })
            }
            aria-label="Voice call"
            className="hover:text-white"
          >
            <Phone size={20} />
          </button>
          <button
            onClick={() =>
              void startCall({
                threadId,
                peerId: peer.peerId ?? undefined,
                peerName: displayName,
                mode: "video",
              })
            }
            aria-label="Video call"
            className="hover:text-white"
          >
            <Video size={20} />
          </button>
          <button onClick={() => setShowOptionsMenu(!showOptionsMenu)} className="hover:text-white"><MoreVertical size={20} /></button>
        </div>

        {/* 3-DOTS OPTIONS DROPDOWN WITH ALL 9 EXACT OPTIONS */}
        {showOptionsMenu && (
          <>
            <div className="fixed inset-0 z-[75]" onClick={() => setShowOptionsMenu(false)} />
            <div className="absolute right-4 top-14 w-64 bg-zinc-900/95 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-[80] backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
              <MenuItem icon={<Pencil size={16} className="text-zinc-400" />} label="Change Display Name" onClick={() => {
                const name = window.prompt("Enter new display name:", displayName);
                if (name?.trim()) { setDisplayName(name.trim()); pushSystem(`Display name changed to ${name.trim()}`); }
                setShowOptionsMenu(false);
              }} />
              <MenuItem icon={<Lock size={16} className="text-zinc-400" />} label="Secret Lock Chat" state={secretLock} onClick={() => {
                setSecretLock((v) => { pushSystem(`Secret lock ${!v ? "enabled" : "disabled"}`); return !v; });
                setShowOptionsMenu(false);
              }} />
              <MenuItem icon={<EyeOff size={16} className="text-zinc-400" />} label="View Once Mode" state={viewOnce} onClick={() => {
                setViewOnce((v) => { pushSystem(`View once mode ${!v ? "on" : "off"}`); return !v; });
                setShowOptionsMenu(false);
              }} />
              <MenuItem icon={<Clock size={16} className="text-zinc-400" />} label={autoDelete ? `Auto Delete: ${autoDelete}s` : "Auto Delete Messages"} state={autoDelete > 0} onClick={() => {
                const next = autoDelete === 0 ? 60 : autoDelete === 60 ? 300 : autoDelete === 300 ? 3600 : 0;
                setAutoDelete(next);
                pushSystem(next ? `Messages will auto delete after ${next}s` : "Auto delete turned off");
                setShowOptionsMenu(false);
              }} />
              <MenuItem icon={<Camera size={16} className="text-zinc-400" />} label="Screenshot Alert" state={screenshotAlert} onClick={() => {
                setScreenshotAlert((v) => { pushSystem(`Screenshot alerts ${!v ? "on" : "off"}`); return !v; });
                setShowOptionsMenu(false);
              }} />
              <MenuItem icon={<VideoOff size={16} className="text-zinc-400" />} label="Screen Recording Alert" state={recordingAlert} onClick={() => {
                setRecordingAlert((v) => { pushSystem(`Recording alerts ${!v ? "on" : "off"}`); return !v; });
                setShowOptionsMenu(false);
              }} />
              <MenuItem icon={<BellOff size={16} className="text-zinc-400" />} label="Mute Notifications" state={muted} onClick={() => {
                setMuted((v) => { pushSystem(`Notifications ${!v ? "muted" : "unmuted"}`); return !v; });
                setShowOptionsMenu(false);
              }} />
              <MenuItem icon={<Trash2 size={16} className="text-zinc-400" />} label="Clear Chat" onClick={() => {
                deleteIds(messages.map((m) => m.id)); exitSelectMode(); setShowOptionsMenu(false);
              }} />
              <MenuItem danger icon={<UserX size={16} className="text-red-400" />} label={blocked ? "Unblock User" : "Block User"} state={blocked} onClick={() => {
                setBlocked((v) => { pushSystem(`${displayName} ${!v ? "blocked" : "unblocked"}`); return !v; });
                setShowOptionsMenu(false);
              }} />
              <MenuItem danger icon={<Flag size={16} className="text-red-400" />} label={reported ? "Reported" : "Report User"} state={reported} onClick={() => {
                if (!reported) { setReported(true); pushSystem(`${displayName} reported. Our team will review.`); }
                setShowOptionsMenu(false);
              }} />
            </div>
          </>
        )}
      </div>

      {/* MESSAGES AREA */}
      {selectMode && (
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
          <button onClick={exitSelectMode} className="text-xs font-semibold text-zinc-300">Cancel</button>
          <span className="text-xs font-bold text-white">{selectedIds.length} selected</span>
          <button
            onClick={() => { deleteIds(selectedIds); setSelectMode(false); }}
            disabled={selectedIds.length === 0}
            className={`text-xs font-bold flex items-center gap-1 ${selectedIds.length ? "text-red-400" : "text-zinc-600"}`}
          >
            <Trash2 size={15} /> Delete
          </button>
        </div>
      )}

      <div className="relative flex-1 overflow-y-auto p-4 space-y-3.5 bg-zinc-950/50" onClick={() => setShowOptionsMenu(false)}>
        <UserWatermark username={currentUser.username} className="fixed text-white" />
        {messages.map((m) => m.system ? (
          <p key={m.id} className="mx-auto w-fit rounded-full bg-zinc-800/70 px-3 py-1 text-center text-[11px] text-zinc-400">
            {m.text}
          </p>
        ) : (
          <div
            key={m.id}
            onPointerDown={() => !selectMode && startLongPress(m.id)}
            onPointerUp={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onContextMenu={(e) => { e.preventDefault(); if (!selectMode) setActionSheetId(m.id); }}
            onClick={() => selectMode && toggleSelect(m.id)}
            className={`flex flex-col ${m.sender === "me" ? "items-end" : "items-start"} ${
              selectMode && selectedIds.includes(m.id) ? "rounded-2xl bg-purple-500/10 ring-1 ring-purple-500/40" : ""
            } ${selectMode ? "cursor-pointer select-none px-1 py-1" : ""}`}
          >
            {selectMode && (
              <span className={`mb-1 flex h-4 w-4 items-center justify-center rounded-full border ${
                selectedIds.includes(m.id) ? "border-purple-500 bg-purple-600 text-white" : "border-zinc-600"
              }`}>
                {selectedIds.includes(m.id) && <Check size={11} />}
              </span>
            )}
            {m.text && (
              <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.sender === "me" ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-xs" : "bg-zinc-800/90 text-zinc-100 rounded-bl-xs border border-zinc-700/50"
              }`}>
                {m.text}
              </div>
            )}

            {m.image && (
              <div className="max-w-[75%] rounded-2xl overflow-hidden border border-zinc-800 shadow-lg">
                <img src={m.image} alt="Attachment" className="w-full h-auto object-cover max-h-60" />
              </div>
            )}

            {m.audio && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl min-w-[200px] ${
                m.sender === "me" ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white" : "bg-zinc-800 text-white border border-zinc-700"
              }`}>
                <button
                  onClick={() => {
                    const aud = new Audio(m.audio);
                    if (playingAudioId === m.id) {
                      setPlayingAudioId(null);
                    } else {
                      setPlayingAudioId(m.id);
                      aud.play();
                      aud.onended = () => setPlayingAudioId(null);
                    }
                  }}
                  className="p-2 bg-white/20 rounded-full"
                >
                  {playingAudioId === m.id ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <div className="flex-1 flex flex-col gap-1">
                  <div className="w-full h-1 bg-white/40 rounded-full overflow-hidden">
                    <div className={`h-full bg-white ${playingAudioId === m.id ? 'w-2/3 animate-pulse' : 'w-0'}`} />
                  </div>
                  <span className="text-[10px] opacity-80">Voice Note</span>
                </div>
              </div>
            )}

            <span className="text-[10px] text-zinc-500 mt-1 px-1">{m.time}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* LONG-PRESS ACTION SHEET */}
      {actionSheetId !== null && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/60 backdrop-blur-sm" onClick={() => setActionSheetId(null)}>
          <div className="w-full rounded-t-3xl border-t border-zinc-800 bg-zinc-900 p-3 pb-6" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-700" />
            <button
              onClick={() => { deleteIds([actionSheetId]); setActionSheetId(null); }}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-950/40"
            >
              <Trash2 size={18} /> Delete Message
            </button>
            <button
              onClick={() => { setSelectMode(true); setSelectedIds([actionSheetId]); setActionSheetId(null); }}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
            >
              <CheckCheck size={18} /> Select Multiple
            </button>
          </div>
        </div>
      )}

      {/* EMOJI PICKER */}
      {showEmojis && (
        <div className="flex gap-2 p-3 bg-zinc-900 border-t border-zinc-800 overflow-x-auto">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setMessage((prev) => prev + e)} className="text-2xl p-2 hover:bg-zinc-800 rounded-xl">
              {e}
            </button>
          ))}
        </div>
      )}

      {/* INPUT BAR */}
      <div className="p-3 bg-zinc-950/95 border-t border-zinc-800/80 backdrop-blur-md flex items-center gap-2 shrink-0">
        {blocked ? (
          <p className="flex-1 text-center text-xs font-semibold text-zinc-500 py-2">
            You blocked {displayName}. Unblock from the menu to message.
          </p>
        ) : isRecording ? (
          <div className="flex-1 flex items-center justify-between bg-red-950/40 border border-red-500/50 rounded-full px-4 py-2 text-red-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              <span className="text-xs font-mono font-bold">Recording {recordingTime}s</span>
            </div>
            <button onClick={stopRecording} className="p-1.5 bg-red-600 text-white rounded-full text-xs font-bold">
              Send
            </button>
          </div>
        ) : (
          <>
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-zinc-400 hover:text-white"><ImageIcon size={22} /></button>
            <button onClick={startRecording} className="p-2 text-zinc-400 hover:text-white"><Mic size={22} /></button>
            
            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Message..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2.5 pl-4 pr-10 text-sm text-white focus:outline-none"
              />
              <button onClick={() => setShowEmojis(!showEmojis)} className="absolute right-3 text-zinc-400 hover:text-white">
                <Smile size={18} />
              </button>
            </div>

            <button
              onClick={handleSend}
              className={`p-2.5 rounded-full flex items-center justify-center ${
                message.trim() ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white" : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              }`}
            >
              <Send size={18} />
            </button>
          </>
        )}
      </div>


    </div>
  );
}

export default ChatThreadPage;
