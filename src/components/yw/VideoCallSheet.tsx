import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Video, VideoOff, Mic, MicOff, PhoneOff } from 'lucide-react';

interface VideoCallSheetProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
}

export const VideoCallSheet: React.FC<VideoCallSheetProps> = ({ isOpen, onClose, targetUserId }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    });
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
      <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
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
