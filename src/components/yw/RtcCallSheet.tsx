import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';

interface RtcCallSheetProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  isIncoming?: boolean;
}

export const RtcCallSheet: React.FC<RtcCallSheetProps> = ({
  isOpen,
  onClose,
  targetUserId,
  isIncoming = false,
}) => {
  const [callStatus, setCallStatus] = useState<string>(isIncoming ? 'Incoming Call...' : 'Calling...');
  const [isMuted, setIsMuted] = useState(false);
  const pc = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pc.current = peer;

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    });

    const channel = supabase.channel(`call_${targetUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new;
        if (msg.type === 'call-answer') {
          peer.setRemoteDescription(new RTCSessionDescription(JSON.parse(msg.content)));
          setCallStatus('Connected');
        }
      })
      .subscribe();

    return () => {
      peer.close();
      supabase.removeChannel(channel);
    };
  }, [isOpen, targetUserId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 text-white">
      <h2 className="text-2xl font-bold mb-4">{callStatus}</h2>
      <div className="flex gap-6 mt-8">
        <button 
          onClick={() => setIsMuted(!isMuted)} 
          className="p-4 bg-gray-700 rounded-full hover:bg-gray-600"
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        <button 
          onClick={onClose} 
          className="p-4 bg-red-600 rounded-full hover:bg-red-700"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
};
