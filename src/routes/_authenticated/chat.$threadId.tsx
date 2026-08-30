import React, { useState, useRef, useEffect, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, Phone, Video, MoreVertical, Image as ImageIcon,
  Mic, Send, Smile, Play, Pause, X, MicOff,
  Pencil, Lock, EyeOff, Clock, Camera, VideoOff, BellOff, UserX, Flag,
  Trash2, CheckCheck, Check, Crop, Type, Sparkles 
} from "lucide-react";
import {
  PHOTO_FILTERS, TEXT_COLORS, STICKER_EMOJIS, cropImage, renderPhoto,
  type Overlay,
} from "@/components/yw/chat/photo-editor";
import { needsProtectionWarning, PLATFORM_PROTECTION_WARNING_TITLE, PLATFORM_PROTECTION_WARNING_BODY } from "@/lib/chat-compliance";
import { UserWatermark } from "@/components/yw/UserWatermark";
import { LazyImage } from "@/components/yw/LazyImage";
import { compressImageFile } from "@/lib/image-compress";
import { useCaptureDetect } from "@/lib/capture-detect";
import { currentUser } from "@/lib/yw-data";
import { useThreadMessages, useThreadPeer, dmThreadId } from "@/lib/social-data";
import { supabase } from "@/integrations/supabase/client";
import { useThreadPresence } from "@/lib/presence";
import { useCall } from "@/lib/call-store";
import { useChatNames, saveChatDisplayName } from "@/lib/chat-names";
import { useChatSettings } from "@/lib/chat-settings";
import { hashPin, randomPinSalt, saveSecretChatLock } from "@/lib/secret-chats";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
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
  read?: boolean;
  viewOnce?: boolean;
  opened?: boolean;
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [isHD, setIsHD] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("normal");
  const [showFilters, setShowFilters] = useState(false);

  const filters = PHOTO_FILTERS;

  // Editor tools
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [activeTool, setActiveTool] = useState<null | "crop" | "emoji" | "text">(null);
  const [textColor, setTextColor] = useState(TEXT_COLORS[0]);
  const [textDraft, setTextDraft] = useState("");
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const cropStart = useRef<{ x: number; y: number } | null>(null);
  const dragId = useRef<string | null>(null);
  const imageBoxRef = useRef<HTMLDivElement>(null);
  const [openedOnce, setOpenedOnce] = useState<string[]>([]);
  const [viewOnceOpen, setViewOnceOpen] = useState<{ id: string; url: string } | null>(null);

  const handleClosePreview = () => {
    if (selectedImage?.startsWith("blob:")) { URL.revokeObjectURL(selectedImage); }
    setSelectedImage(null);
    setCaption("");
    setIsViewOnce(false);
    setSelectedFilter("normal");
    setShowFilters(false);
    setOverlays([]);
    setActiveTool(null);
    setCropRect(null);
    setTextDraft("");
  };
  const { threadId } = Route.useParams();

  // Legacy links used the peer's user id as the thread id, which split the
  // conversation in two. Send those straight to the shared canonical thread.
  useEffect(() => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(threadId)) return;
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id;
      if (!alive || !uid || uid === threadId) return;
      void navigate({
        to: "/chat/$threadId",
        params: { threadId: dmThreadId(uid, threadId) },
        replace: true,
      });
    });
    return () => {
      alive = false;
    };
  }, [threadId, navigate]);

  const { startCall } = useCall();
  const {
    messages: dbMessages,
    currentUserId,
    send: sendToDb,
    remove: removeFromDb,
    markRead,
    burnMedia,
    loading: messagesLoading,
    loadingMore,
    hasMore,
    loadOlder,
  } = useThreadMessages(threadId, { staleTime: Infinity });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const keepScrollRef = useRef<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
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
      image: m.media_type.startsWith("image") ? m.media_url ?? undefined : undefined,
      audio: m.media_type === "audio" ? m.media_url ?? undefined : undefined,
      sender: m.sender_id === currentUserId ? "me" : "them",
      system: m.media_type === "system",
      time: fmtTime(m.created_at),
      ts: new Date(m.created_at).getTime(),
      read: m.is_read,
      viewOnce: m.media_type.startsWith("image_once"),
      opened: m.media_type === "image_once_opened",
    }));
    return [...fromDb, ...localMessages]
      .filter((m) => !hiddenIds.includes(m.id))
      .sort((a, b) => a.ts - b.ts);
  }, [dbMessages, localMessages, hiddenIds, currentUserId]);

  // Read receipts: any visible incoming message is marked read.
  useEffect(() => {
    if (!currentUserId) return;
    const unread = dbMessages
      .filter((m) => m.sender_id !== currentUserId && !m.is_read)
      .map((m) => m.id);
    if (unread.length) void markRead(unread);
  }, [dbMessages, currentUserId, markRead]);

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
  // Live presence: online dot + "typing..." indicator.
  const { peerOnline, peerTyping, setTyping } = useThreadPresence(threadId, currentUserId);

  // Live view once: if the media is burned on either device, close the viewer.
  useEffect(() => {
    if (!viewOnceOpen) return;
    const row = dbMessages.find((m) => m.id === viewOnceOpen.id);
    if (row && (!row.media_url || row.media_type === "image_once_opened")) {
      setOpenedOnce((prev) => (prev.includes(viewOnceOpen.id) ? prev : [...prev, viewOnceOpen.id]));
      setViewOnceOpen(null);
    }
  }, [dbMessages, viewOnceOpen]);

  // Chat options persisted per conversation in the backend.
  const { settings, patch } = useChatSettings(peer.peerId);
  const { nameFor } = useChatNames();
  const displayName = nameFor(peer.peerId, settings.displayName ?? peer.peerName ?? "");
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const setDisplayName = (n: string) => {
    patch({ displayName: n });
    void saveChatDisplayName(peer.peerId ?? "", n);
  };

  const secretLock = settings.secretLock;
  const [chatUnlocked, setChatUnlocked] = useState(false);
  const [unlockPin, setUnlockPin] = useState("");
  const toggleSecretLock = async () => {
    const peerId = peer.peerId;
    if (!peerId) {
      pushSystem("Chat is still loading");
      return;
    }
    if (secretLock) {
      const pin = window.prompt("Enter the chat PIN to remove Secret Lock:");
      const salt = settings.secretPinSalt;
      const hash = settings.secretPinHash;
      if (!pin || !salt || !hash || (await hashPin(salt, pin)) !== hash) {
        pushSystem("Incorrect PIN");
        return;
      }
      await saveSecretChatLock(peerId, false, null, null);
      patch({ secretLock: false, secretPinSalt: null, secretPinHash: null });
      setChatUnlocked(true);
      pushSystem("Secret lock disabled");
      return;
    }
    const pin = window.prompt("Create a 4-8 digit PIN for this chat:");
    if (!pin || !/^\d{4,8}$/.test(pin)) {
      pushSystem("Use a 4-8 digit PIN");
      return;
    }
    const salt = randomPinSalt();
    const hash = await hashPin(salt, pin);
    await saveSecretChatLock(peerId, true, salt, hash);
    patch({ secretLock: true, secretPinSalt: salt, secretPinHash: hash });
    setChatUnlocked(true);
    pushSystem("Secret lock enabled");
  };
  const viewOnce = settings.viewOnce;
  const autoDelete = settings.autoDelete;
  const screenshotAlert = settings.screenshotAlert;
  const recordingAlert = settings.recordingAlert;
  const muted = settings.muted;
  const blocked = settings.blocked;
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
    // Older pages prepend above — keep the reader anchored instead of jumping down.
    if (keepScrollRef.current !== null && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight - keepScrollRef.current;
      keepScrollRef.current = null;
      return;
    }
    const id = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: didFirstScroll.current ? "smooth" : "auto",
        block: "end",
      });
      didFirstScroll.current = true;
    });
    return () => cancelAnimationFrame(id);
  }, [messages, isRecording]);

  const onScrollMessages = () => {
    const el = scrollRef.current;
    if (!el || el.scrollTop > 80 || loadingMore || !hasMore) return;
    keepScrollRef.current = el.scrollHeight;
    void loadOlder();
  };


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

  const doSend = (currentMsg: string) => {
    if (currentUserId) {
      void sendToDb({ content: currentMsg, media_type: "text" });
    } else {
      pushLocal({ text: currentMsg, sender: "me" });
    }
    setMessage("");
    setShowEmojis(false);
  };

  const handleSend = () => {
    if (!message.trim() || blocked) return;
    if (needsProtectionWarning(message)) {
      setProtectionWarning(message);
      return;
    }
    doSend(message);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    // Compress on-device first so sending/uploading is near-instant.
    const compressed = await compressImageFile(file, { maxDim: 1600, quality: 0.82 });
    setCaption("");
    setIsViewOnce(false);
    setSelectedFilter("normal");
    setShowFilters(false);
    setSelectedImage(compressed);
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
    <>
    <div className="fixed inset-0 z-50 bg-black text-white font-sans flex flex-col justify-between overflow-hidden">
      {secretLock && !chatUnlocked && settings.secretPinHash ? (
        <div className="absolute inset-0 z-[95] grid place-items-center bg-black px-6">
          <form
            className="w-full max-w-xs space-y-4 text-center"
            onSubmit={(e) => {
              e.preventDefault();
              void (async () => {
                const salt = settings.secretPinSalt;
                const hash = settings.secretPinHash;
                if (!salt || !hash || (await hashPin(salt, unlockPin)) !== hash) return;
                setChatUnlocked(true);
                setUnlockPin("");
              })();
            }}
          >
            <Lock size={28} className="mx-auto text-purple-400" />
            <div>
              <h1 className="text-lg font-bold">Secret chat locked</h1>
              <p className="mt-1 text-xs text-zinc-400">Enter your PIN to open this conversation.</p>
            </div>
            <input
              value={unlockPin}
              onChange={(e) => setUnlockPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              inputMode="numeric"
              type="password"
              autoFocus
              aria-label="Secret chat PIN"
              className="h-12 w-full rounded-xl bg-zinc-900 px-4 text-center text-lg outline-none"
            />
            <button type="submit" className="h-11 w-full rounded-xl bg-purple-600 text-sm font-bold">Unlock</button>
          </form>
        </div>
      ) : null}
      
      <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
      <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />

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
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-black rounded-full ${
                peerOnline ? "bg-emerald-500" : "bg-zinc-600"
              }`}
            />
          </div>

          <div className="flex flex-col">
            <span className="font-bold text-sm leading-tight text-white flex items-center gap-1">
              {displayName}
              {secretLock && <Lock size={12} className="text-purple-400" />}
              {muted && <BellOff size={12} className="text-zinc-500" />}
            </span>
            <span className="text-[11px] font-medium">
              {blocked ? (
                <span className="text-red-400">Blocked</span>
              ) : peerTyping ? (
                <span className="text-purple-400">typing...</span>
              ) : peerOnline ? (
                <span className="text-emerald-400">Online</span>
              ) : (
                <span className="text-zinc-500">Offline</span>
              )}
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
                setNameDraft(displayName);
                setNameDialogOpen(true);
                setShowOptionsMenu(false);
              }} />
              <MenuItem icon={<Lock size={16} className="text-zinc-400" />} label="Secret Lock Chat" state={secretLock} onClick={() => {
                void toggleSecretLock();
                setShowOptionsMenu(false);
              }} />
              <MenuItem icon={<EyeOff size={16} className="text-zinc-400" />} label="View Once Mode" state={viewOnce} onClick={() => {
                patch({ viewOnce: !viewOnce }); pushSystem(`View once mode ${!viewOnce ? "on" : "off"}`);
                setShowOptionsMenu(false);
              }} />
              <MenuItem icon={<Clock size={16} className="text-zinc-400" />} label={autoDelete ? `Auto Delete: ${autoDelete}s` : "Auto Delete Messages"} state={autoDelete > 0} onClick={() => {
                const next = autoDelete === 0 ? 60 : autoDelete === 60 ? 300 : autoDelete === 300 ? 3600 : 0;
                patch({ autoDelete: next });
                pushSystem(next ? `Messages will auto delete after ${next}s` : "Auto delete turned off");
                setShowOptionsMenu(false);
              }} />
              <MenuItem icon={<Camera size={16} className="text-zinc-400" />} label="Screenshot Alert" state={screenshotAlert} onClick={() => {
                patch({ screenshotAlert: !screenshotAlert }); pushSystem(`Screenshot alerts ${!screenshotAlert ? "on" : "off"}`);
                setShowOptionsMenu(false);
              }} />
              <MenuItem icon={<VideoOff size={16} className="text-zinc-400" />} label="Screen Recording Alert" state={recordingAlert} onClick={() => {
                patch({ recordingAlert: !recordingAlert }); pushSystem(`Recording alerts ${!recordingAlert ? "on" : "off"}`);
                setShowOptionsMenu(false);
              }} />
              <MenuItem icon={<BellOff size={16} className="text-zinc-400" />} label="Mute Notifications" state={muted} onClick={() => {
                patch({ muted: !muted }); pushSystem(`Notifications ${!muted ? "muted" : "unmuted"}`);
                setShowOptionsMenu(false);
              }} />
              <MenuItem icon={<Trash2 size={16} className="text-zinc-400" />} label="Clear Chat" onClick={() => {
                deleteIds(messages.map((m) => m.id)); exitSelectMode(); setShowOptionsMenu(false);
              }} />
              <MenuItem danger icon={<UserX size={16} className="text-red-400" />} label={blocked ? "Unblock User" : "Block User"} state={blocked} onClick={() => {
                patch({ blocked: !blocked }); pushSystem(`${displayName} ${!blocked ? "blocked" : "unblocked"}`);
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

      <div ref={scrollRef} onScroll={onScrollMessages} className="relative flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] p-4 space-y-3.5 bg-zinc-950/50" onClick={() => setShowOptionsMenu(false)}>
        <UserWatermark username={currentUser.username} className="fixed text-white" />
        {loadingMore ? (
          <p className="py-1 text-center text-[11px] text-zinc-500">Loading older messages…</p>
        ) : null}
        {messagesLoading && messages.length === 0 && (
          <div className="space-y-3.5" aria-hidden>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
                <div
                  className="h-10 animate-pulse rounded-2xl bg-gradient-to-r from-zinc-800/70 via-zinc-700/60 to-zinc-800/70 bg-[length:200%_100%]"
                  style={{ width: `${45 + ((i * 37) % 30)}%` }}
                />
              </div>
            ))}
          </div>
        )}
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

            {m.image && m.viewOnce && m.sender === "them" && !m.opened && !openedOnce.includes(m.id) ? (
              <button
                type="button"
                onClick={() => {
                  setViewOnceOpen({ id: m.id, url: m.image! });
                }}
                className="max-w-[75%] flex items-center gap-2 rounded-2xl border border-emerald-600/60 bg-emerald-950/30 px-4 py-3 text-xs font-bold text-emerald-400"
              >
                <span className="w-5 h-5 rounded-full border border-emerald-500 flex items-center justify-center">1</span>
                Tap to view once
              </button>
            ) : m.image && !(m.viewOnce && (m.opened || openedOnce.includes(m.id))) ? (
              <div className="max-w-[75%] rounded-2xl overflow-hidden border border-zinc-800 shadow-lg">
                <LazyImage
                  src={m.image}
                  alt="Attachment"
                  wrapperClassName="w-full"
                  className="w-full h-auto object-cover max-h-60"
                />
              </div>
            ) : null}

            {m.viewOnce && m.sender === "them" && (m.opened || openedOnce.includes(m.id)) && (
              <div className="max-w-[75%] flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-800/70 px-4 py-3 text-xs font-semibold text-zinc-400">
                <EyeOff size={15} /> Opened
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

            <span className="text-[10px] text-zinc-500 mt-1 px-1 flex items-center gap-1">
              {m.time}
              {m.sender === "me" && (
                m.local ? (
                  <Check size={12} className="text-zinc-500" />
                ) : m.read ? (
                  <CheckCheck size={12} className="text-sky-400" />
                ) : (
                  <CheckCheck size={12} className="text-zinc-500" />
                )
              )}
            </span>
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
              <button type="button" aria-label="Open camera" className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white mr-2 shrink-0" onClick={() => cameraInputRef.current?.click()}>
  <Camera size={18} />
</button>
              <input
                type="text"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setTyping(e.target.value.trim().length > 0);
                }}
                onBlur={() => setTyping(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setTyping(false);
                    handleSend();
                  }
                }}
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
    {/* WhatsApp / Instagram Style Full Screen Editor */}
{viewOnceOpen && (
  <div className="fixed inset-0 z-[95] bg-black flex flex-col">
    <div className="flex items-center justify-between p-4 text-white">
      <span className="text-xs font-bold text-emerald-400 flex items-center gap-2"><EyeOff size={14} /> View once</span>
      <button
        type="button"
        onClick={() => {
          setViewOnceOpen(null);
        }}
        className="p-2 bg-zinc-800/80 rounded-full"
      >
        <X size={20} />
      </button>
    </div>
    <div className="flex-1 flex items-center justify-center p-4">
      <LazyImage
        src={viewOnceOpen.url}
        alt="View once"
        loading="eager"
        onLoad={() => {
          const openedId = viewOnceOpen.id;
          setOpenedOnce((prev) => (prev.includes(openedId) ? prev : [...prev, openedId]));
          void burnMedia(openedId);
        }}
        wrapperClassName="max-h-full max-w-full"
        className="max-h-full max-w-full object-contain rounded-lg"
      />
    </div>
  </div>
)}
{selectedImage && (
  <div className="fixed inset-0 bg-black z-50 flex flex-col justify-between p-4">
    {/* Top Controls */}
    <div className="flex items-center justify-between text-white pt-2 px-2 z-10">
      <button type="button" onClick={handleClosePreview} className="p-2 bg-zinc-800/80 rounded-full hover:bg-zinc-700">
        <X size={20} />
      </button>
      <div className="flex items-center gap-3">
        <button 
          type="button"
          onClick={() => setIsHD(!isHD)} 
          className={`px-2 py-0.5 text-xs font-bold border rounded transition-all ${isHD ? 'border-emerald-500 text-emerald-400 bg-emerald-950/40' : 'border-zinc-600 text-zinc-400'}`}
        >
          HD
        </button>
        <button 
          type="button"
          onClick={() => setShowFilters(!showFilters)} 
          className={`p-2 rounded-full transition-all ${showFilters ? 'bg-emerald-500 text-black' : 'bg-zinc-800/80 text-zinc-200'}`}
        >
          <Sparkles size={18} />
        </button>
        <button
          type="button"
          onClick={() => { setActiveTool((t) => (t === "crop" ? null : "crop")); setCropRect(null); }}
          className={`p-2 rounded-full transition-all ${activeTool === "crop" ? "bg-emerald-500 text-black" : "bg-zinc-800/80 text-zinc-300"}`}
        >
          <Crop size={18} />
        </button>
        <button
          type="button"
          onClick={() => setActiveTool((t) => (t === "emoji" ? null : "emoji"))}
          className={`p-2 rounded-full transition-all ${activeTool === "emoji" ? "bg-emerald-500 text-black" : "bg-zinc-800/80 text-zinc-300"}`}
        >
          <Smile size={18} />
        </button>
        <button
          type="button"
          onClick={() => setActiveTool((t) => (t === "text" ? null : "text"))}
          className={`p-2 rounded-full transition-all ${activeTool === "text" ? "bg-emerald-500 text-black" : "bg-zinc-800/80 text-zinc-300"}`}
        >
          <Type size={18} />
        </button>
      </div>
    </div>

    {/* Center Image */}
    <div
      ref={imageBoxRef}
      className="flex-1 flex items-center justify-center my-2 overflow-hidden relative touch-none"
      onPointerDown={(e) => {
        if (activeTool !== "crop") return;
        const r = imageBoxRef.current!.getBoundingClientRect();
        cropStart.current = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
        setCropRect({ x: cropStart.current.x, y: cropStart.current.y, w: 0, h: 0 });
      }}
      onPointerMove={(e) => {
        const r = imageBoxRef.current!.getBoundingClientRect();
        const nx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
        const ny = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
        if (activeTool === "crop" && cropStart.current) {
          const s = cropStart.current;
          setCropRect({ x: Math.min(s.x, nx), y: Math.min(s.y, ny), w: Math.abs(nx - s.x), h: Math.abs(ny - s.y) });
          return;
        }
        if (dragId.current) {
          const id = dragId.current;
          setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, x: nx, y: ny } : o)));
        }
      }}
      onPointerUp={() => { cropStart.current = null; dragId.current = null; }}
      onPointerLeave={() => { cropStart.current = null; dragId.current = null; }}
    >
      <img 
        src={selectedImage} 
        alt="Preview" 
        draggable={false}
        className={`max-h-full max-w-full object-contain rounded-lg transition-all duration-300 ${filters.find(f => f.id === selectedFilter)?.class || ''}`} 
      />

      {/* Draggable text / emoji overlays */}
      {overlays.map((o) => (
        <button
          key={o.id}
          type="button"
          onPointerDown={(e) => { e.stopPropagation(); dragId.current = o.id; }}
          onDoubleClick={() => setOverlays((prev) => prev.filter((x) => x.id !== o.id))}
          style={{
            left: `${o.x * 100}%`,
            top: `${o.y * 100}%`,
            color: o.color,
            fontSize: `${o.size * 4}px`,
            textShadow: o.kind === "text" ? "0 1px 4px rgba(0,0,0,0.7)" : undefined,
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 font-bold leading-none cursor-move select-none touch-none"
        >
          {o.value}
        </button>
      ))}

      {/* Crop selection */}
      {activeTool === "crop" && cropRect && cropRect.w > 0.02 && cropRect.h > 0.02 && (
        <div
          className="absolute border-2 border-emerald-400 bg-emerald-400/10 pointer-events-none"
          style={{
            left: `${cropRect.x * 100}%`,
            top: `${cropRect.y * 100}%`,
            width: `${cropRect.w * 100}%`,
            height: `${cropRect.h * 100}%`,
          }}
        />
      )}
    </div>

    {/* Crop actions */}
    {activeTool === "crop" && (
      <div className="flex items-center justify-center gap-3 py-2">
        <span className="text-[11px] text-zinc-400">Drag on the photo to select an area</span>
        <button
          type="button"
          disabled={!cropRect || cropRect.w < 0.02 || cropRect.h < 0.02}
          onClick={async () => {
            if (!selectedImage || !cropRect) return;
            const next = await cropImage(selectedImage, cropRect);
            setSelectedImage(next);
            setCropRect(null);
            setActiveTool(null);
          }}
          className="px-4 py-1.5 rounded-full bg-emerald-500 text-black text-xs font-bold disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          Apply crop
        </button>
      </div>
    )}

    {/* Emoji sticker picker */}
    {activeTool === "emoji" && (
      <div className="flex gap-2 overflow-x-auto py-2 px-1 no-scrollbar">
        {STICKER_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() =>
              setOverlays((prev) => [
                ...prev,
                { id: `o-${Date.now()}-${Math.random()}`, kind: "emoji", value: e, x: 0.5, y: 0.5, color: "#fff", size: 10 },
              ])
            }
            className="text-2xl p-2 bg-zinc-800 rounded-xl shrink-0"
          >
            {e}
          </button>
        ))}
      </div>
    )}

    {/* Text tool */}
    {activeTool === "text" && (
      <div className="flex flex-col gap-2 py-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={textDraft}
            onChange={(ev) => setTextDraft(ev.target.value)}
            placeholder="Type text..."
            style={{ color: textColor }}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2 text-sm font-bold focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (!textDraft.trim()) return;
              setOverlays((prev) => [
                ...prev,
                { id: `o-${Date.now()}-${Math.random()}`, kind: "text", value: textDraft.trim(), x: 0.5, y: 0.4, color: textColor, size: 8 },
              ]);
              setTextDraft("");
            }}
            className="px-4 py-2 rounded-full bg-emerald-500 text-black text-xs font-bold"
          >
            Add
          </button>
        </div>
        <div className="flex gap-2 px-1">
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setTextColor(c)}
              style={{ background: c }}
              className={`w-6 h-6 rounded-full border-2 ${textColor === c ? "border-emerald-400 scale-110" : "border-zinc-700"}`}
            />
          ))}
        </div>
        <span className="text-[11px] text-zinc-500 px-1">Drag overlays to move, double-tap to remove.</span>
      </div>
    )}

    {/* Filters Carousel */}
    {showFilters && (
      <div className="flex gap-2 overflow-x-auto py-2 px-1 my-1 no-scrollbar justify-start sm:justify-center">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setSelectedFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              selectedFilter === f.id 
                ? 'bg-emerald-500 text-black font-bold scale-105' 
                : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>
    )}

    {/* Bottom Bar */}
    <div className="flex flex-col gap-3 pb-2 z-10">
      <div className="flex items-center bg-zinc-900 border border-zinc-700/80 rounded-full px-4 py-2 gap-2">
        <ImageIcon size={18} className="text-zinc-400" />
        <input
          type="text"
          placeholder="Add a caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="bg-transparent text-white text-sm flex-1 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setIsViewOnce(!isViewOnce)}
          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
            isViewOnce ? 'bg-emerald-500 text-black scale-110 shadow-lg shadow-emerald-500/30' : 'bg-zinc-800 text-white border border-zinc-600'
          }`}
        >
          1
        </button>
      </div>

      <div className="flex items-center justify-end px-2">
        <button
          type="button"
          onClick={async () => {
            if (!selectedImage) return;
            const filterCss = filters.find((f) => f.id === selectedFilter)?.css ?? "none";
            const finalImage = await renderPhoto(selectedImage, filterCss, overlays);
            if (currentUserId) {
              void sendToDb({
                media_url: finalImage,
                media_type: isViewOnce ? "image_once" : "image",
                content: caption,
              });
            } else {
              pushLocal({ image: finalImage, text: caption || undefined, sender: "me", viewOnce: isViewOnce });
            }
            handleClosePreview();
          }}
          className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg active:scale-95 transition-all"
        >
          <Send size={20} className="ml-0.5" />
        </button>
      </div>
    </div>
  </div>
)}
{nameDialogOpen && (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-6" onClick={() => setNameDialogOpen(false)}>
    <div className="w-full max-w-xs rounded-2xl border border-zinc-800 bg-zinc-900 p-4" onClick={(e) => e.stopPropagation()}>
      <p className="mb-3 text-sm font-semibold text-white">Change Display Name</p>
      <input
        autoFocus
        value={nameDraft}
        onChange={(e) => setNameDraft(e.target.value)}
        placeholder="Display name"
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none"
      />
      <div className="mt-4 flex justify-end gap-2">
        <button className="rounded-xl px-3 py-2 text-sm text-zinc-400" onClick={() => setNameDialogOpen(false)}>Cancel</button>
        <button
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => {
            const next = nameDraft.trim();
            if (next) { setDisplayName(next); pushSystem(`Display name changed to ${next}`); }
            setNameDialogOpen(false);
          }}
        >
          Save
        </button>
      </div>
    </div>
  </div>
)}
    </>
  );
}

export default ChatThreadPage;