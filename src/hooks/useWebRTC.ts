import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useWebRTC = (currentUserId: string, targetUserId: string) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    pc.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    const channel = supabase
      .channel(`call:${currentUserId}-${targetUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_signals' }, async (payload) => {
        const signal = payload.new;
        if (signal.receiver_id !== currentUserId) return;

        if (signal.type === 'offer') {
          await pc.current?.setRemoteDescription(new RTCSessionDescription(signal.payload));
          const answer = await pc.current?.createAnswer();
          await pc.current?.setLocalDescription(answer);
          await supabase.from('call_signals').insert({
            caller_id: currentUserId,
            receiver_id: targetUserId,
            type: 'answer',
            payload: answer
          });
        } else if (signal.type === 'answer') {
          await pc.current?.setRemoteDescription(new RTCSessionDescription(signal.payload));
        } else if (signal.type === 'ice-candidate') {
          await pc.current?.addIceCandidate(new RTCIceCandidate(signal.payload));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      pc.current?.close();
    };
  }, [currentUserId, targetUserId]);

  const startCall = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);
    stream.getTracks().forEach((track) => pc.current?.addTrack(track, stream));

    pc.current!.onicecandidate = async (event) => {
      if (event.candidate) {
        await supabase.from('call_signals').insert({
          caller_id: currentUserId,
          receiver_id: targetUserId,
          type: 'ice-candidate',
          payload: event.candidate
        });
      }
    };

    const offer = await pc.current?.createOffer();
    await pc.current?.setLocalDescription(offer);
    await supabase.from('call_signals').insert({
      caller_id: currentUserId,
      receiver_id: targetUserId,
      type: 'offer',
      payload: offer
    });
  };

  return { localStream, remoteStream, startCall };
};
