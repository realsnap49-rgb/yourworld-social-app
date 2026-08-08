import React, { useState, useRef, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Phone, Video, MoreVertical, Image as ImageIcon, Mic, Send, Smile } from "lucide-react";

export const Route = createFileRoute("/chat/$threadId")({
  component: ChatThreadPage,
});

export function ChatThreadPage() {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, text: "Hey! How's it going?", sender: "them", time: "8:20 PM" },
    { id: 2, text: "All good bro! Working on the app layout.", sender: "me", time: "8:22 PM" },
    { id: 3, text: "Awesome! Let me know when it's live.", sender: "them", time: "8:25 PM" },
  ]);

  // Auto Scroll to Bottom on New Message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text: message, sender: "me", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setMessage("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white font-sans flex flex-col justify-between overflow-hidden">
      
      {/* 1. TOP HEADER (Fixed at top, Premium Glassmorphism) */}
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
          <button className="hover:text-white active:scale-90 transition-transform"><Phone size={20} /></button>
          <button className="hover:text-white active:scale-90 transition-transform"><Video size={20} /></button>
          <button className="hover:text-white active:scale-90 transition-transform"><MoreVertical size={20} /></button>
        </div>
      </div>

      {/* 2. CHAT MESSAGES AREA (Fills exact middle space, Smooth Scroll) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-zinc-950/50">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === "me" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                m.sender === "me"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-xs"
                  : "bg-zinc-800/90 text-zinc-100 rounded-bl-xs border border-zinc-700/50"
              }`}
            >
              {m.text}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 px-1">{m.time}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. INPUT BAR (Fixed at bottom, No Overflow, Premium Fit) */}
      <div className="p-3 bg-zinc-950/95 border-t border-zinc-800/80 backdrop-blur-md flex items-center gap-2 shrink-0">
        <button className="p-2 text-zinc-400 hover:text-white active:scale-90 transition-transform">
          <ImageIcon size={22} />
        </button>
        <button className="p-2 text-zinc-400 hover:text-white active:scale-90 transition-transform">
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
          <button className="absolute right-3 text-zinc-400 hover:text-white">
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
      </div>

    </div>
  );
}

export default ChatThreadPage;
