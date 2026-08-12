import React, { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { X, RefreshCw, Zap, ZapOff, Music, Clock, Sparkles, Wand2, Download, Video, Crop, ZoomIn, RotateCw, Move, Type, Scissors, Sparkle } from "lucide-react";

export const Route = createFileRoute("/create")({ component: CreateStudioPage });

export function CreateStudioPage() {
  const navigate = useNavigate();
  // Camera & Record States
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  
  // Editor States
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Camera Init
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true })
      .then((stream) => { if (videoRef.current) videoRef.current.srcObject = stream; })
      .catch(console.error);
  }, []);

  // Recording Logic
  const toggleRecording = () => {
    if (!isRecording) {
      const stream = (videoRef.current?.srcObject as MediaStream);
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setVideoUrl(URL.createObjectURL(blob));
        setShowEditor(true);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } else {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
  };

  const handleSaveVideo = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = "my-creation.webm";
    a.click();
    alert("Saved to Gallery!");
    navigate({ to: "/" });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white">
      {/* CAMERA MODE */}
      {!showEditor && (
        <div className="relative w-full h-full">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          
          {/* Side Toolbar */}
          <div className="absolute left-4 top-20 flex flex-col gap-4">
            <button className="p-2 bg-black/50 rounded-full"><Sparkles className="w-5 h-5 text-amber-300" /></button>
            <button className="p-2 bg-black/50 rounded-full"><Wand2 className="w-5 h-5 text-purple-400" /></button>
            <button className="p-2 bg-black/50 rounded-full"><Clock className="w-5 h-5 text-emerald-400" /></button>
          </div>

          {/* Shutter */}
          <button 
            onClick={toggleRecording}
            className={`absolute bottom-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full border-4 ${isRecording ? "bg-red-500 animate-pulse" : "bg-white"}`}
          />
        </div>
      )}

      {/* EDITOR MODE */}
      {showEditor && (
        <div className="w-full h-full flex flex-col bg-zinc-950">
          <div className="flex justify-between p-4 border-b border-zinc-800">
            <button onClick={() => setShowEditor(false)}><X /></button>
            <button onClick={handleSaveVideo} className="flex gap-2 bg-pink-600 px-4 py-2 rounded-full font-bold text-sm">
              <Download size={16} /> Save
            </button>
          </div>

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center p-4">
             <div 
              onMouseDown={(e) => { setIsDragging(true); dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y }; }}
              onMouseMove={(e) => { if(isDragging) setPosition({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y }); }}
              onMouseUp={() => setIsDragging(false)}
              className="overflow-hidden border border-white/20 rounded-2xl"
              style={{ aspectRatio: aspectRatio === "1:1" ? "1/1" : "9/16", maxHeight: "100%", maxWidth: "100%" }}
            >
              <video src={videoUrl || ""} autoPlay loop muted className="w-full h-full object-cover" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)` }} />
            </div>
          </div>

          {/* Editor Toolbar */}
          <div className="bg-black p-4 flex justify-around">
            <button onClick={() => setScale(scale + 0.2)} className="flex flex-col items-center"><ZoomIn size={20}/> Zoom</button>
            <button onClick={() => setRotation(rotation + 90)} className="flex flex-col items-center"><RotateCw size={20}/> Rotate</button>
            <button onClick={() => setAspectRatio(aspectRatio === "9:16" ? "1:1" : "9:16")} className="flex flex-col items-center"><Crop size={20}/> Ratio</button>
            <button className="flex flex-col items-center"><Type size={20}/> Text</button>
          </div>
        </div>
      )}
    </div>
  );
}
