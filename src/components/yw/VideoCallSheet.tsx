import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Video, VideoOff, Mic, MicOff, PhoneOff, SwitchCamera, Zap, ZapOff } from 'lucide-react';

interface VideoCallSheetProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
}

export const VideoCallSheet: React.FC<VideoCallSheetProps> = ({ isOpen, onClose, targetUserId }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isFlashOn, setIsFlashOn] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Simple ringtone sound generator
  useEffect(() => {
    if (!isOpen) return;
    
    // Play Ringtone logic using Web Audio API (No external file needed)
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    let isPlaying = true;

    const playRingtone = async () => {
      while (isPlaying) {
        try {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 1.5);
          await new Promise(r => setTimeout(r, 3000));
        } catch (e) {
          break;
        }
      }
    };
    playRingtone();

    return () => {
      isPlaying = false;
      audioCtx.close();
    };
  }, [isOpen]);

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
        console.warn("Flashlight not supported.");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 999999 }}>
      {/* Background Video */}
      <video 
        ref={localVideoRef} 
        autoPlay 
        playsInline 
        muted 
        style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} 
      />
      
      {/* Top Controls (Flash & Camera Switch) Forced Visible */}
      <div style={{ position: 'absolute', top: '24px', right: '24px', display: 'flex', gap: '12px', zIndex: 1000000 }}>
        <button 
          onClick={toggleFlash} 
          style={{ padding: '12px', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '9999px', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
        >
          {isFlashOn ? <Zap size={22} color="#facc15" /> : <ZapOff size={22} />}
        </button>
        <button 
          onClick={toggleCamera} 
          style={{ padding: '12px', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '9999px', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
        >
          <SwitchCamera size={22} />
        </button>
      </div>

      {/* Bottom Controls */}
      <div style={{ position: 'absolute', bottom: '40px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '24px', zIndex: 1000000 }}>
        <button 
          onClick={() => setIsMuted(!isMuted)} 
          style={{ padding: '16px', borderRadius: '9999px', color: '#fff', backgroundColor: isMuted ? '#ef4444' : 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.3)' }}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        <button 
          onClick={() => setIsVideoOff(!isVideoOff)} 
          style={{ padding: '16px', borderRadius: '9999px', color: '#fff', backgroundColor: isVideoOff ? '#ef4444' : 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.3)' }}
        >
          {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
        </button>
        <button 
          onClick={onClose} 
          style={{ padding: '16px', backgroundColor: '#dc2626', borderRadius: '9999px', color: '#fff' }}
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
};
