import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff, SwitchCamera, PhoneIncoming } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type RtcMode = "voice" | "video";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
];

interface RtcCallSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string | null;
  mode: RtcMode;
  recipientName?: string;
  isIncoming?: boolean;
}

export const RtcCallSheet: React.FC<RtcCallSheetProps> = ({
  open,
  onOpenChange,
  conversationId,
  mode,
  recipientName = "User",
  isIncoming = false,
}) => {
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(mode === "video");
  const [callStatus, setCallStatus] = useState<string>("Connecting...");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [callAccepted, setCallAccepted] = useState(!isIncoming);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!open || !conversationId) return;

    let isMounted = true;

    const startCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: mode === "video" ? { facingMode } : false,
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
            if (status === "SUBSCRIBED" && !isIncoming) {
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
        console.error("Call error:", err);
        setCallStatus("Camera/mic permission declined");
      }
    };

    if (callAccepted) {
      startCall();
    }

    return () => {
      isMounted = false;
      cleanupCall();
    };
  }, [open, conversationId, callAccepted]);

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

  const acceptCall = () => {
    setCallAccepted(true);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] bg-black text-white p-4 flex flex-col justify-between rounded-t-3xl border-none">
        <div className="text-center my-4">
          <h2 className="text-xl font-bold">{recipientName}</h2>
          <p className="text-sm text-gray-400">{!callAccepted ? "Incoming Call..." : callStatus}</p>
        </div>

        {!callAccepted ? (
          <div className="flex justify-center items-center gap-8 my-auto">
            <button onClick={endCall} className="p-4 bg-red-600 rounded-full text-white hover:bg-red-700">
              <PhoneOff size={32} />
            </button>
            <button onClick={acceptCall} className="p-4 bg-green-600 rounded-full text-white hover:bg-green-700 animate-bounce">
              <PhoneIncoming size={32} />
            </button>
          </div>
        ) : (
          <>
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
              {mode === "video" && (
                <button onClick={toggleVideo} className={cn("p-4 rounded-full", videoOn ? "bg-zinc-800" : "bg-red-600")}>
                  {videoOn ? <Video size={24} /> : <VideoOff size={24} />}
                </button>
              )}
              <button onClick={endCall} className="p-4 bg-red-600 rounded-full hover:bg-red-700">
                <PhoneOff size={24} />
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
