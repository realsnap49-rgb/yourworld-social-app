import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Camera, Zap, ZapOff } from 'lucide-react';

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

  useEffect(() => {
    if (!isOpen) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: true
        });
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Camera error:", err);
      }
    };
    startCamera();
  }, [isOpen, facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
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
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
      <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      
      <div className="absolute top-4 right-4 flex gap-4">
        <button onClick={toggleCamera} className="p-3 bg-white/20 rounded-full text-white">
          <Camera size={24} />
        </button>
        <button onClick={toggleFlash} className="p-3 bg-white/20 rounded-full text-white">
          {isFlashOn ? <Zap size={24} /> : <ZapOff size={24} />}
        </button>
      </div>

      <div className="absolute bottom-10 flex gap-6">
        <button onClick={() => setIsMuted(!isMuted)} className="p-4 bg-gray-800 rounded-full text-white">
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        <button onClick={() => setIsVideoOff(!isVideoOff)} className="p-4 bg-gray-800 rounded-full text-white">
          {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
        </button>
        <button onClick={onClose} className="p-4 bg-red-600 rounded-full text-white">
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
};
