import React, { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { X, RefreshCw, Zap, Music, Sparkles, Image as ImageIcon, Type, Pencil, Download, Send, Smile, Wand2, MoreHorizontal, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/moment/create")({
  component: MomentCreatePage,
});

export function MomentCreatePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [flash, setFlash] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [textList, setTextList] = useState<{ id: number; text: string; x: number; y: number }[]>([]);
  const [caption, setCaption] = useState("");

  // 1. HIGH QUALITY CAMERA WITH FLASH
  useEffect(() => {
    if (step !== 0) return;
    navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 3840 }, height: { ideal: 2160 }, facingMode: "user" },
      audio: false
    }).then(async (stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Flash / Torch Support
        const track = stream.getVideoTracks()[0];
        if (flash) await track.applyConstraints({ advanced: [{ torch: true } as any] });
      }
    }).catch(console.error);
  }, [step, flash]);

  // 2. PINCH TO ZOOM LOGIC
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && step === 1) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      setZoom(Math.min(Math.max(dist / 200, 1), 3));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white font-sans select-none overflow-hidden" onTouchMove={handleTouchMove}>
      
      {/* STEP 0: CAMERA */}
      {step === 0 && (
        <div className="relative w-full h-full">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <button onClick={() => navigate({ to: ".." })} className="absolute top-6 left-4 p-3 bg-black/50 rounded-full"><X size={24}/></button>
          <button onClick={() => setFlash(!flash)} className={`absolute top-6 right-4 p-3 rounded-full ${flash ? 'bg-yellow-500' : 'bg-black/50'}`}><Zap size={24}/></button>
          <div className="absolute bottom-10 w-full flex justify-center">
            <button onClick={() => {
               const canvas = document.createElement("canvas");
               canvas.width = videoRef.current!.videoWidth; canvas.height = videoRef.current!.videoHeight;
               canvas.getContext("2d")!.drawImage(videoRef.current!, 0, 0);
               setCapturedImage(canvas.toDataURL("image/jpeg", 1.0));
               setStep(1);
            }} className="w-20 h-20 rounded-full border-4 border-white bg-white/20 active:scale-90" />
          </div>
        </div>
      )}

      {/* STEP 1: PRO EDITOR */}
      {step === 1 && (
        <div className="relative w-full h-full bg-black overflow-hidden" onTouchMove={handleTouchMove}>
          <img src={capturedImage!} style={{ transform: `scale(${zoom})` }} className="w-full h-full object-contain transition-transform" />
          
          {/* Side Icons: SMALL, STRAIGHT LINE */}
          <div className="absolute right-3 top-20 flex flex-col gap-4">
            <button onClick={() => {const t=prompt("Text:"); if(t) setTextList([...textList, {id:Date.now(), text:t, x:50, y:200}]);}} className="p-2 bg-black/50 rounded-full"><Type size={20}/></button>
            <button className="p-2 bg-black/50 rounded-full"><Smile size={20}/></button>
            <button className="p-2 bg-black/50 rounded-full"><Music size={20}/></button>
            <button className="p-2 bg-black/50 rounded-full"><Wand2 size={20}/></button>
            <button className="p-2 bg-black/50 rounded-full"><Pencil size={20}/></button>
            <button className="p-2 bg-black/50 rounded-full"><Download size={20}/></button>
            <button className="p-2 bg-black/50 rounded-full"><MoreHorizontal size={20}/></button>
          </div>

          {/* Draggable Text */}
          {textList.map(t => (
            <div key={t.id} className="absolute p-3 bg-black/60 rounded-xl font-bold cursor-move" style={{left: t.x, top: t.y}} 
                 onTouchMove={(e) => {
                    const x = e.touches[0].clientX - 40;
                    const y = e.touches[0].clientY - 20;
                    setTextList(prev => prev.map(item => item.id === t.id ? {...item, x, y} : item));
                 }}>
              {t.text}
            </div>
          ))}

          <input type="text" placeholder="Add a caption..." className="absolute bottom-20 left-4 bg-transparent border-b w-[80%]" onChange={e=>setCaption(e.target.value)} />
          <button onClick={() => setStep(2)} className="absolute bottom-20 right-6 p-4 bg-indigo-600 rounded-full"><ChevronRight size={24}/></button>
        </div>
      )}

      {/* STEP 2: SHARE SHEET */}
      {step === 2 && (
        <div className="fixed inset-0 z-50 bg-black/90 p-6 flex flex-col gap-6">
          <h2 className="text-2xl font-bold">Preview & Share</h2>
          <button onClick={() => { alert("Posted!"); navigate({ to: ".." }); }} className="w-full py-4 bg-gradient-to-r from-teal-400 to-pink-500 rounded-full font-bold">Share Moment</button>
        </div>
      )}
    </div>
  );
}

export default MomentCreatePage;
