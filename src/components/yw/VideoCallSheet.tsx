import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff, SwitchCamera, PhoneIncoming } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
];

interface VideoCallSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName?: string;
  conversationId?: string;
  isVideoCall?: boolean;
}

export const VideoCallSheet: React.FC<VideoCallSheetProps> = ({
  open,
  onOpenChange,
  recipientName = "User",
  conversationId = "default-room",
  isVideoCall = true,
}) => {
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(isVideoCall);
  const [callStatus, setCallStatus] = useState<string>("Connecting...");
  const [callAccepted, setCallAccepted] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!open) return;

    let isMounted = true;

    const startCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideoCall,
        });

        if (!isMounted) return;
        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setCallStatus("Connected");
          }
        };

        const channel = supabase.channel(`call_${conversationId}`);
        channelRef.current = channel;

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.send({
              type: "broadcast",
              event: "signal",
              payload: { candidate: event.candidate },
            });
          }
        };

        channel
          .on("broadcast", { event: "signal" }, async ({ payload }) => {
            if (payload.offer) {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              channel.send({
                type: "broadcast",
                event: "signal",
                payload: { answer },
              });
            } else if (payload.answer) {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            } else if (payload.candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } else if (payload.end) {
              endCall();
            }
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              channel.send({
                type: "broadcast",
                event: "signal",
                payload: { offer },
              });
            }
          });
      } catch (err) {
        console.error("Media error:", err);
        setCallStatus("Permission denied");
      }
    };

    startCall();

    return () => {
      isMounted = false;
      cleanupCall();
    };
  }, [open, conversationId]);

  const cleanupCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
  };

  const endCall = () => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "signal",
        payload: { end: true },
      });
    }
    cleanupCall();
    onOpenChange(false);
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoOn(videoTrack.enabled);
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 text-white flex flex-col justify-between p-4">
      <div className="text-center my-4">
        <h2 className="text-xl font-bold">{recipientName}</h2>
        <p className="text-sm text-gray-400">{callStatus}</p>
      </div>

      <div className="relative flex-1 bg-zinc-900 rounded-2xl overflow-hidden flex items-center justify-center">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute top-4 right-4 w-28 h-40 bg-black rounded-xl object-cover border-2 border-zinc-700"
        />
      </div>

      <div className="flex justify-center items-center gap-6 py-6">
        <button onClick={toggleMic} className={cn("p-4 rounded-full", micOn ? "bg-zinc-800" : "bg-red-600")}>
          {micOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>
        {isVideoCall && (
          <button onClick={toggleVideo} className={cn("p-4 rounded-full", videoOn ? "bg-zinc-800" : "bg-red-600")}>
            {videoOn ? <Video size={24} /> : <VideoOff size={24} />}
          </button>
        )}
        <button onClick={endCall} className="p-4 bg-red-600 rounded-full hover:bg-red-700">
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
};
