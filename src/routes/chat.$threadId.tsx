import React, { useState, useRef, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, Phone, Video, MoreVertical, Image as ImageIcon,
  Mic, Send, Smile, Play, Pause, X, MicOff
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

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hey! How's it going?", sender: "them", time: "8:20 PM" },
    { id: 2, text: "All good bro! Working on the app layout.", sender: "me", time: "8:22 PM" },
    { id: 3, text: "Awesome! Let me know when it's live.", sender: "them", time: "8:25 PM" },
  ]);

  // States
  const [showEmojis, setShowEmojis] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeCall, setActiveCall] = useState<"audio" | "video" | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);

  const EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "😍", "👏", "🙌", "🚀", "💯"];

  // Auto Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isRecording]);

  // Voice Note Timer
  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  // Real-time Auto Reply simulation
  const triggerAutoReply = (userText: string) => {
    setTimeout(() => {
      const replies = [
        "Sahi hai bhai!",
        "Mast chal raha hai 🔥",
        "Dekhte hain aage kya hota hai!",
        "Got it, bro!",
        "Bilkul perfect lag raha hai 👌"
      ];
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

  // Send Text Message
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
    triggerAutoReply(currentMsg);
  };

  // Image Upload Handler
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
          triggerAutoReply("image");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Start Real Audio Recording
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
        triggerAutoReply("voice_note");
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone permission required for voice notes.");
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
      
      {/* Hidden File Input for Gallery */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />

      {/* TOP HEADER */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-950/90 border-b border-zinc-800/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate({ to: ".." })} className="p-1 text-zinc-300 hover:text-white active:scale-90 transition-transform">
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
          <button onClick={() => setActiveCall("audio")} className="hover:text-white active:scale-90 transition-transform"><Phone size={20} /></button>
          <button onClick={() => setActiveCall("video")} className="hover:text-white active:scale-90 transition-transform"><Video size={20} /></button>
          <button className="hover:text-white active:scale-90 transition-transform"><MoreVertical size={20} /></button>
        </div>
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-zinc-950/50">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === "me" ? "items-end" : "items-start"}`}
          >
            {/* Text Message */}
            {m.text && (
              <div
                className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  m.sender === "me"
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-xs"
                    : "bg-zinc-800/90 text-zinc-100 rounded-bl-xs border border-zinc-700/50"
                }`}
              >
                {m.text}
              </div>
            )}

            {/* Image Message */}
            {m.image && (
              <div className="max-w-[75%] rounded-2xl overflow-hidden border border-zinc-800 shadow-lg">
                <img src={m.image} alt="Sent attachment" className="w-full h-auto object-cover max-h-60" />
              </div>
            )}

            {/* Audio Voice Note Message */}
            {m.audio && (
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl min-w-[200px] ${
                  m.sender === "me"
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                    : "bg-zinc-800 text-white border border-zinc-700"
                }`}
              >
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
                  className="p-2 bg-white/20 rounded-full active:scale-90"
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

      {/* EMOJI PICKER POPUP */}
      {showEmojis && (
        <div className="flex gap-2 p-3 bg-zinc-900 border-t border-zinc-800 overflow-x-auto">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => setMessage((prev) => prev + emoji)}
              className="text-2xl p-2 hover:bg-zinc-800 rounded-xl active:scale-90"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* INPUT BAR / VOICE RECORDING BAR */}
      <div className="p-3 bg-zinc-950/95 border-t border-zinc-800/80 backdrop-blur-md flex items-center gap-2 shrink-0">
        {isRecording ? (
          /* Voice Note Recording Active State */
          <div className="flex-1 flex items-center justify-between bg-red-950/40 border border-red-500/50 rounded-full px-4 py-2 text-red-400 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
              <span className="text-xs font-mono font-bold">Recording... {recordingTime}s</span>
            </div>
            <button onClick={stopRecording} className="p-1.5 bg-red-600 text-white rounded-full font-bold text-xs">
              Done / Send
            </button>
          </div>
        ) : (
          /* Normal Messaging Inputs */
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-zinc-400 hover:text-white active:scale-90 transition-transform"
            >
              <ImageIcon size={22} />
            </button>

            <button
              onClick={startRecording}
              className="p-2 text-zinc-400 hover:text-white active:scale-90 transition-transform"
            >
              <Mic size={22} />
            </button>

            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Message..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2.5 pl-4 pr-10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50"
              />
              <button
                onClick={() => setShowEmojis(!showEmojis)}
                className="absolute right-3 text-zinc-400 hover:text-white"
              >
                <Smile size={18} />
              </button>
            </div>

            <button
              onClick={handleSend}
              className={`p-2.5 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                message.trim()
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              }`}
            >
              <Send size={18} className="translate-x-0.5" />
            </button>
          </>
        )}
      </div>

      {/* CALL MODAL SCREEN */}
      {activeCall && (
        <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-between p-8 text-white animate-in fade-in duration-200">
          <div className="flex flex-col items-center gap-3 mt-12">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-4xl font-bold shadow-2xl animate-pulse">
              U
            </div>
            <h2 className="text-xl font-bold">Active User</h2>
            <span className="text-xs text-zinc-400">
              {activeCall === "video" ? "Calling Video..." : "Calling Audio..."}
            </span>
          </div>

          <div className="flex items-center gap-6 mb-12">
            <button className="p-4 bg-zinc-800 rounded-full"><MicOff size={24} /></button>
            <button
              onClick={() => setActiveCall(null)}
              className="p-5 bg-red-600 text-white rounded-full shadow-2xl active:scale-90"
            >
              <X size={28} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default ChatThreadPage;
