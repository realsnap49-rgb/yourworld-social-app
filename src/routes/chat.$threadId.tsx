import React, { useState, useRef, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, Phone, Video, MoreVertical, Image as ImageIcon,
  Mic, Send, Smile, Play, Pause, X, MicOff,
  Pencil, Lock, EyeOff, Clock, Camera, VideoOff, BellOff, UserX, Flag
} from "lucide-react";

export const Route = createFileRoute("/chat/$threadId")({
  component: ChatThreadPage,
});

type Message = {
  id: number;
  text?: string;
  image?: string;
  audio?: string;
  sender: "me" | "them";
  time: string;
};

export function ChatThreadPage() {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const callVideoRef = useRef<HTMLVideoElement>(null);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hey! How's it going?", sender: "them", time: "8:20 PM" },
    { id: 2, text: "All good bro! Working on the app layout.", sender: "me", time: "8:22 PM" },
    { id: 3, text: "Awesome! Let me know when it's live.", sender: "them", time: "8:25 PM" },
  ]);

  const [showEmojis, setShowEmojis] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeCall, setActiveCall] = useState<"audio" | "video" | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);

  const EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "😍", "👏", "🙌", "🚀", "💯"];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isRecording]);

  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (activeCall === "video") {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((s) => {
          stream = s;
          if (callVideoRef.current) callVideoRef.current.srcObject = s;
        })
        .catch(console.error);
    }
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [activeCall]);

  const triggerAutoReply = () => {
    setTimeout(() => {
      const replies = ["Sahi hai bhai!", "Mast chal raha hai 🔥", "Got it, bro!", "Bilkul perfect lag raha hai 👌"];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: randomReply,
          sender: "them",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1500);
  };

  const handleSend = () => {
    if (!message.trim()) return;
    const currentMsg = message;
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: currentMsg,
        sender: "me",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setMessage("");
    setShowEmojis(false);
    triggerAutoReply();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now(),
              image: event.target?.result as string,
              sender: "me",
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
          triggerAutoReply();
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
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            audio: audioUrl,
            sender: "me",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        stream.getTracks().forEach((t) => t.stop());
        triggerAutoReply();
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
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-950/90 border-b border-zinc-800/80 backdrop-blur-md shrink-0 relative">
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
            <span className="font-bold text-sm leading-tight text-white">Active User</span>
            <span className="text-[11px] text-emerald-400 font-medium">Online</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-zinc-300">
          <button onClick={() => setActiveCall("audio")} className="hover:text-white"><Phone size={20} /></button>
          <button onClick={() => setActiveCall("video")} className="hover:text-white"><Video size={20} /></button>
          <button onClick={() => setShowOptionsMenu(!showOptionsMenu)} className="hover:text-white"><MoreVertical size={20} /></button>
        </div>

        {/* 3-DOTS OPTIONS DROPDOWN WITH ALL 9 EXACT OPTIONS */}
        {showOptionsMenu && (
          <div className="absolute right-4 top-14 w-60 bg-zinc-900/95 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
            <button onClick={() => { const name = prompt("Enter new display name:"); if(name) alert(`Display name changed to ${name}`); setShowOptionsMenu(false); }} className="w-full text-left px-3 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800/80 rounded-xl flex items-center gap-3">
              <Pencil size={16} className="text-zinc-400" />
              <span>Change Display Name</span>
            </button>

            <button onClick={() => { alert("Secret Lock Activated!"); setShowOptionsMenu(false); }} className="w-full text-left px-3 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800/80 rounded-xl flex items-center gap-3">
              <Lock size={16} className="text-zinc-400" />
              <span>Secret Lock Chat</span>
            </button>

            <button onClick={() => { alert("View Once Mode Toggled!"); setShowOptionsMenu(false); }} className="w-full text-left px-3 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800/80 rounded-xl flex items-center gap-3">
              <EyeOff size={16} className="text-zinc-400" />
              <span>View Once Mode</span>
            </button>

            <button onClick={() => { alert("Auto Delete Messages Set!"); setShowOptionsMenu(false); }} className="w-full text-left px-3 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800/80 rounded-xl flex items-center gap-3">
              <Clock size={16} className="text-zinc-400" />
              <span>Auto Delete Messages</span>
            </button>

            <button onClick={() => { alert("Screenshot Alert Toggled!"); setShowOptionsMenu(false); }} className="w-full text-left px-3 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800/80 rounded-xl flex items-center gap-3">
              <Camera size={16} className="text-zinc-400" />
              <span>Screenshot Alert</span>
            </button>

            <button onClick={() => { alert("Screen Recording Alert Toggled!"); setShowOptionsMenu(false); }} className="w-full text-left px-3 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800/80 rounded-xl flex items-center gap-3">
              <VideoOff size={16} className="text-zinc-400" />
              <span>Screen Recording Alert</span>
            </button>

            <button onClick={() => { alert("Notifications Muted!"); setShowOptionsMenu(false); }} className="w-full text-left px-3 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800/80 rounded-xl flex items-center gap-3">
              <BellOff size={16} className="text-zinc-400" />
              <span>Mute Notifications</span>
            </button>

            <button onClick={() => { alert("User Blocked!"); setShowOptionsMenu(false); }} className="w-full text-left px-3 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-950/40 rounded-xl flex items-center gap-3">
              <UserX size={16} className="text-red-400" />
              <span>Block User</span>
            </button>

            <button onClick={() => { alert("User Reported!"); setShowOptionsMenu(false); }} className="w-full text-left px-3 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-950/40 rounded-xl flex items-center gap-3">
              <Flag size={16} className="text-red-400" />
              <span>Report User</span>
            </button>
          </div>
        )}
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-zinc-950/50" onClick={() => setShowOptionsMenu(false)}>
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.sender === "me" ? "items-end" : "items-start"}`}>
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
        {isRecording ? (
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

      {/* CALL MODAL */}
      {activeCall && (
        <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col justify-between p-6 text-white animate-in fade-in duration-200">
          {activeCall === "video" && (
            <video ref={callVideoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover z-0" />
          )}

          <div className="relative z-10 flex flex-col items-center gap-3 mt-12 bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-3xl font-bold shadow-2xl">
              U
            </div>
            <h2 className="text-xl font-bold">Active User</h2>
            <span className="text-xs text-emerald-400 font-bold animate-pulse">
              {activeCall === "video" ? "Video Call Connected..." : "Audio Call Connected..."}
            </span>
          </div>

          <div className="relative z-10 flex items-center justify-center gap-6 mb-10">
            <button onClick={() => setIsMuted(!isMuted)} className={`p-4 rounded-full backdrop-blur-md ${isMuted ? 'bg-red-500 text-white' : 'bg-zinc-800/80 text-white'}`}>
              <MicOff size={22} />
            </button>
            <button onClick={() => setActiveCall(null)} className="p-5 bg-red-600 text-white rounded-full shadow-2xl active:scale-90">
              <X size={26} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default ChatThreadPage;
