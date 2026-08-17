import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Video, VideoOff, Mic, MicOff, PhoneOff, SwitchCamera, Zap, ZapOff, Sparkles } from 'lucide-react';

interface VideoCallSheetProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  status?: 'ringing' | 'connecting' | 'connected';
}

export const VideoCallSheet: React.FC<VideoCallSheetProps> = ({ isOpen, onClose, targetUserId, status = 'ringing' }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isBlurOn, setIsBlurOn] = useState(false); // Background blur state
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Looping ringback tone while ringing / connecting
  useEffect(() => {
    if (!isOpen || status === 'connected') return;

    let ctx: AudioContext | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    try {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
      void ctx.resume?.();

      const beep = () => {
        if (!ctx || stopped) return;
        const now = ctx.currentTime;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.connect(ctx.destination);
        [440, 480].forEach((freq) => {
          const osc = ctx!.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq;
          osc.connect(gain);
          osc.start(now);
          osc.stop(now + 1.2);
        });
        gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        gain.gain.setValueAtTime(0.08, now + 1.1);
        gain.gain.linearRampToValueAtTime(0, now + 1.2);
      };

      beep();
      timer = setInterval(beep, 3000);
    } catch {
      // audio unavailable — ignore
    }

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      void ctx?.close?.();
    };
  }, [isOpen, status]);

  useEffect(() => {
    if (!isOpen) return;

    let currentStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        currentStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: true
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = currentStream;
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    };

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  const toggleFlash = async () => {
    const stream = localVideoRef.current?.srcObject as MediaStream;
    const track = stream?.getVideoTracks()[0];
    if (track) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: !isFlashOn }] as any
        });
        setIsFlashOn(!isFlashOn);
      } catch (err) {
        console.warn("Flashlight not supported on this device.");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[9999]">
      {/* Full screen video feed with Blur toggle */}
      <video 
        ref={localVideoRef} 
        autoPlay 
        playsInline 
        muted 
        className={`w-full h-full object-cover absolute inset-0 transition-all duration-300 ${isBlurOn ? 'blur-md scale-105' : 'blur-none'}`} 
      />
      
      {/* Status pill */}
      {status !== 'connected' && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[80] px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white/90 text-sm capitalize">
          {status}...
        </div>
      )}

      {/* Top Right Controls: Blur Toggle, Flash & Switch Camera — always pinned above the call card */}
      <div className="fixed top-6 right-6 flex gap-3 z-[100] pointer-events-auto">
        <button 
          onClick={() => setIsBlurOn(!isBlurOn)} 
          title="Toggle Background Blur"
          className={`p-3 rounded-full text-white backdrop-blur-md border border-white/20 active:scale-95 transition ${isBlurOn ? 'bg-purple-600' : 'bg-black/50'}`}
        >
          <Sparkles size={22} className={isBlurOn ? 'text-yellow-300' : 'text-white'} />
        </button>
        <button 
          onClick={toggleFlash} 
          className="p-3 bg-black/50 backdrop-blur-md rounded-full text-white border border-white/20 active:scale-95 transition"
        >
          {isFlashOn ? <Zap size={22} className="text-yellow-400 fill-yellow-400" /> : <ZapOff size={22} />}
        </button>
        <button 
          onClick={toggleCamera} 
          className="p-3 bg-black/50 backdrop-blur-md rounded-full text-white border border-white/20 active:scale-95 transition"
        >
          <SwitchCamera size={22} />
        </button>
      </div>

      {/* Bottom Call Controls */}
      <div className="absolute bottom-10 flex gap-6 z-50 items-center">
        <button 
          onClick={() => setIsMuted(!isMuted)} 
          className={`p-4 rounded-full text-white backdrop-blur-md transition active:scale-95 ${isMuted ? 'bg-red-500' : 'bg-white/20'}`}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        <button 
          onClick={() => setIsVideoOff(!isVideoOff)} 
          className={`p-4 rounded-full text-white backdrop-blur-md transition active:scale-95 ${isVideoOff ? 'bg-red-500' : 'bg-white/20'}`}
        >
          {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
        </button>
        <button 
          onClick={onClose} 
          className="p-4 bg-red-600 rounded-full text-white active:scale-95 transition shadow-lg"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
};
