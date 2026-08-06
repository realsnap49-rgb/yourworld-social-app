import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Mic,
  SendHorizontal,
  Check,
  CheckCheck,
  Play,
  Phone,
  Video,
  MoreVertical,
  MapPin,
  Lock,
  Eye,
  BellOff,
  UserX,
  Flag,
  Calendar,
  Edit2,
  Trash2,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/chat/$threadId")({
  component: ChatThreadPage,
});

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  media_url?: string;
  media_type?: "image" | "audio" | "video" | "location" | "meetup";
  created_at: string;
  is_read?: boolean;
}

function ChatThreadPage() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [userPinInput, setUserPinInput] = useState("");
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch current user & setup realtime subscription
  useEffect(() => {
    async function initChat() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Fetch existing messages
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
    }

    initChat();

    // Supabase Realtime Channel
    const channel = supabase
      .channel(`chat_${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send Text Message
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const newMsg = {
      thread_id: threadId,
      sender_id: currentUser?.id || "anon",
      content: inputText,
      media_type: "text",
    };

    setInputText("");

    const { error } = await supabase.from("direct_messages").insert([newMsg]);
    if (error) {
      console.error("Error sending message:", error);
    }
  };

  // Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const filePath = `chat_media/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("chat_files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("chat_files").getPublicUrl(filePath);

      await supabase.from("direct_messages").insert([
        {
          thread_id: threadId,
          sender_id: currentUser?.id || "anon",
          content: isViewOnce ? "📷 View once photo" : "📷 Photo",
          media_url: data.publicUrl,
          media_type: "image",
        },
      ]);
    } catch (err: any) {
      alert("Image upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Voice Note Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const filePath = `voice_notes/${Date.now()}.webm`;

        setUploading(true);
        const { error } = await supabase.storage
          .from("chat_files")
          .upload(filePath, audioBlob);

        if (!error) {
          const { data } = supabase.storage.from("chat_files").getPublicUrl(filePath);
          await supabase.from("direct_messages").insert([
            {
              thread_id: threadId,
              sender_id: currentUser?.id || "anon",
              content: "🎙️ Voice message",
              media_url: data.publicUrl,
              media_type: "audio",
            },
          ]);
        }
        setUploading(false);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access denied!");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Share Live Location
  const shareLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      const locUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

      await supabase.from("direct_messages").insert([
        {
          thread_id: threadId,
          sender_id: currentUser?.id || "anon",
          content: `📍 Live Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          media_url: locUrl,
          media_type: "location",
        },
      ]);
      setShowOptions(false);
    });
  };

  // Lock Chat
  const handleLockChat = () => {
    const userPin = prompt("Enter a 4-digit PIN to lock this chat:");
    if (userPin) {
      setPin(userPin);
      setIsLocked(true);
      setShowOptions(false);
      alert("Chat locked successfully!");
    }
  };

  if (isLocked) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black text-white p-6">
        <Lock className="h-16 w-16 text-primary mb-4" />
        <h2 className="text-xl font-bold mb-2">Secret Locked Chat</h2>
        <p className="text-sm text-gray-400 mb-6">Enter PIN to view messages</p>
        <input
          type="password"
          maxLength={4}
          value={userPinInput}
          onChange={(e) => setUserPinInput(e.target.value)}
          placeholder="ENTER PIN"
          className="bg-zinc-900 border border-zinc-700 text-center text-2xl tracking-widest px-4 py-2 rounded-lg w-40 mb-4"
        />
        <button
          onClick={() => {
            if (userPinInput === pin) setIsLocked(false);
            else alert("Incorrect PIN!");
          }}
          className="bg-primary px-6 py-2 rounded-lg font-semibold"
        >
          Unlock Chat
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <Link to="/chat">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center font-bold">
              U
            </div>
            <div>
              <h3 className="font-semibold text-sm">Active User</h3>
              <span className="text-xs text-emerald-400">Online</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => alert("Starting Audio Call...")}>
            <Phone className="h-5 w-5 text-gray-300 hover:text-white" />
          </button>
          <button onClick={() => alert("Starting Video Call...")}>
            <Video className="h-5 w-5 text-gray-300 hover:text-white" />
          </button>
          <button onClick={() => setShowOptions(!showOptions)}>
            <MoreVertical className="h-5 w-5 text-gray-300 hover:text-white" />
          </button>
        </div>
      </div>

      {/* Options Dropdown Menu */}
      {showOptions && (
        <div className="absolute top-16 right-4 z-50 w-60 rounded-xl bg-zinc-900 p-2 shadow-2xl border border-zinc-800 text-sm flex flex-col gap-1">
          <button onClick={shareLocation} className="flex items-center gap-3 p-2 hover:bg-zinc-800 rounded-lg">
            <MapPin className="h-4 w-4 text-emerald-400" /> Share Live Location
          </button>
          <button onClick={handleLockChat} className="flex items-center gap-3 p-2 hover:bg-zinc-800 rounded-lg">
            <Lock className="h-4 w-4 text-amber-400" /> Secret Lock Chat
          </button>
          <button onClick={() => { setIsViewOnce(!isViewOnce); setShowOptions(false); }} className="flex items-center gap-3 p-2 hover:bg-zinc-800 rounded-lg">
            <Eye className="h-4 w-4 text-blue-400" /> View Once Mode ({isViewOnce ? "ON" : "OFF"})
          </button>
          <button onClick={() => { alert("Notifications Muted"); setShowOptions(false); }} className="flex items-center gap-3 p-2 hover:bg-zinc-800 rounded-lg">
            <BellOff className="h-4 w-4 text-gray-400" /> Mute Notifications
          </button>
          <button onClick={() => { alert("User Blocked"); setShowOptions(false); }} className="flex items-center gap-3 p-2 hover:bg-zinc-800 rounded-lg text-rose-500">
            <UserX className="h-4 w-4" /> Block User
          </button>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.sender_id === (currentUser?.id || "anon");
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isMe ? "bg-gradient-to-r from-purple-600 to-pink-600" : "bg-zinc-800"}`}>
                {msg.media_type === "image" && msg.media_url && (
                  <img src={msg.media_url} alt="media" className="rounded-lg mb-2 max-h-60 object-cover" />
                )}
                {msg.media_type === "audio" && msg.media_url && (
                  <audio controls src={msg.media_url} className="w-full my-1" />
                )}
                {msg.media_type === "location" && (
                  <a href={msg.media_url} target="_blank" rel="noreferrer" className="underline text-blue-300 font-medium">
                    {msg.content}
                  </a>
                )}
                {msg.media_type !== "location" && <p>{msg.content}</p>}
                <span className="text-[10px] text-gray-300 block text-right mt-1 opacity-70">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-zinc-800 flex items-center gap-2">
        <label className="cursor-pointer p-2 text-gray-400 hover:text-white">
          <ImageIcon className="h-5 w-5" />
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>

        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`p-2 rounded-full ${isRecording ? "bg-red-600 animate-pulse text-white" : "text-gray-400 hover:text-white"}`}
        >
          <Mic className="h-5 w-5" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder={isRecording ? "Recording audio..." : "Message..."}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-zinc-700"
        />

        <button onClick={handleSendMessage} className="p-2 text-primary hover:text-primary/80">
          <SendHorizontal className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
