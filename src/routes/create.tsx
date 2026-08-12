import React, { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { X, Check, Download, Type, Scissors, Sparkle, Music } from "lucide-react";

export const Route = createFileRoute("/create")({ component: CreateStudioPage });

export function CreateStudioPage() {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // 1. Camera Logic
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => { if (videoRef.current) videoRef.current.srcObject = stream; })
      .catch(console.error);
  }, []);

  // 2. Start/Stop Recording
  const toggleRecording = () => {
    if (!isRecording) {
      const stream = (videoRef.current?.srcObject as MediaStream);
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setVideoUrl(URL.createObjectURL(blob));
        setShowEditor(true); // Auto-open editor
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } else {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
  };

  // 3. REAL SAVE / DOWNLOAD FUNCTION
  const handleSaveVideo = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = "my-reel.webm";
    a.click();
    alert("Video Saved to Gallery!");
    navigate({ to: "/" });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white">
      {/* Camera View */}
      {!showEditor && (
        <div className="relative w-full h-full">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <button 
            onClick={toggleRecording}
            className={`absolute bottom-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full border-4 ${isRecording ? "bg-red-500 animate-pulse" : "bg-white"}`}
          />
        </div>
      )}

      {/* Editor UI */}
      {showEditor && (
        <div className="w-full h-full flex flex-col p-4 bg-black">
          <div className="flex justify-between items-center py-4">
            <button onClick={() => setShowEditor(false)}><X /></button>
            <button onClick={handleSaveVideo} className="flex gap-2 bg-pink-600 px-4 py-2 rounded-full font-bold">
              <Download size={18} /> Save / Share
            </button>
          </div>
          
          <video src={videoUrl || ""} controls className="w-full rounded-2xl border border-zinc-700" />
          
          {/* Editor Buttons */}
          <div className="grid grid-cols-4 gap-4 mt-8">
            <button className="flex flex-col items-center"><Scissors/> Trim</button>
            <button className="flex flex-col items-center"><Type/> Text</button>
            <button className="flex flex-col items-center"><Sparkle/> Filter</button>
            <button className="flex flex-col items-center"><Music/> Audio</button>
          </div>
        </div>
      )}
    </div>
  );
}
