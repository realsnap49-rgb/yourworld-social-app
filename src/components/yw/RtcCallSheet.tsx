import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff, SwitchCamera } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type RtcMode = "voice" | "video";

const ICE = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
];

/**
 * Peer-to-peer voice/video call over WebRTC.
 * Signalling (offer/answer/ICE) rides a Supabase Realtime broadcast channel
 * keyed by the conversation id, so both peers negotiate directly — no media
 * ever touches the server.
 */
export function RtcCallSheet({
  mode,
  roomId,
  selfId,
  peerName,
  onClose,
}: {
  mode: RtcMode | null;
  roomId: string;
  selfId: string;
  peerName: string;
  onClose: () => void;
}) {
  const open = mode !== null;
  const localRef = useRef<HTMLVideoElement | null>(null);
  const remoteRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const politeRef = useRef(false);
  const makingOfferRef = useRef(false);

  const [status, setStatus] = useState("Starting…");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [seconds, setSeconds] = useState(0);
  const [remoteLive, setRemoteLive] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const channel = supabase.channel(`rtc:${roomId}`, {
      config: { broadcast: { self: false } },
    });

    const send = (event: string, payload: unknown) =>
      channel.send({ type: "broadcast", event, payload: { from: selfId, data: payload } });

    const pc = new RTCPeerConnection({ iceServers: ICE });
    pcRef.current = pc;
    const remoteStream = new MediaStream();

    pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach((t) => remoteStream.addTrack(t));
      if (remoteRef.current) remoteRef.current.srcObject = remoteStream;
      setRemoteLive(true);
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) void send("ice", e.candidate.toJSON());
    };
    pc.onconnectionstatechange = () => {
      if (cancelled) return;
      const s = pc.connectionState;
      if (s === "connected") setStatus("Connected");
      else if (s === "connecting") setStatus("Connecting…");
      else if (s === "failed") setStatus("Connection failed");
      else if (s === "disconnected") setStatus("Reconnecting…");
    };

    const negotiate = async () => {
      try {
        makingOfferRef.current = true;
        await pc.setLocalDescription();
        if (pc.localDescription) await send("sdp", pc.localDescription.toJSON());
      } catch {
        /* ignore */
      } finally {
        makingOfferRef.current = false;
      }
    };
    pc.onnegotiationneeded = () => void negotiate();

    channel
      .on("broadcast", { event: "hello" }, async ({ payload }) => {
        if (payload?.from === selfId) return;
        // Lower id is impolite and drives the initial offer.
        politeRef.current = selfId > String(payload?.from ?? "");
        setStatus("Ringing…");
        await send("hello-ack", null);
        if (!politeRef.current) void negotiate();
      })
      .on("broadcast", { event: "hello-ack" }, ({ payload }) => {
        if (payload?.from === selfId) return;
        politeRef.current = selfId > String(payload?.from ?? "");
        setStatus("Ringing…");
        if (!politeRef.current) void negotiate();
      })
      .on("broadcast", { event: "sdp" }, async ({ payload }) => {
        if (payload?.from === selfId) return;
        const desc = payload.data as RTCSessionDescriptionInit;
        const offerCollision =
          desc.type === "offer" && (makingOfferRef.current || pc.signalingState !== "stable");
        if (offerCollision && !politeRef.current) return;
        try {
          if (offerCollision) await pc.setLocalDescription({ type: "rollback" } as never);
          await pc.setRemoteDescription(desc);
          if (desc.type === "offer") {
            await pc.setLocalDescription();
            if (pc.localDescription) await send("sdp", pc.localDescription.toJSON());
          }
        } catch {
          /* ignore */
        }
      })
      .on("broadcast", { event: "ice" }, async ({ payload }) => {
        if (payload?.from === selfId) return;
        try {
          await pc.addIceCandidate(payload.data as RTCIceCandidateInit);
        } catch {
          /* ignore */
        }
      })
      .on("broadcast", { event: "bye" }, ({ payload }) => {
        if (payload?.from === selfId) return;
        setStatus("Call ended");
        onClose();
      });

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: mode === "video" ? { facingMode: facing, width: { ideal: 1280 } } : false,
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        localStreamRef.current = stream;
        if (localRef.current) localRef.current.srcObject = stream;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        setStatus("Waiting for " + peerName + "…");
        channel.subscribe((s) => {
          if (s === "SUBSCRIBED") void send("hello", null);
        });
      } catch {
        if (!cancelled) setStatus("Camera/mic permission declined");
      }
    })();

    return () => {
      cancelled = true;
      void channel.send({ type: "broadcast", event: "bye", payload: { from: selfId } });
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      pc.getSenders().forEach((s) => s.track?.stop());
      pc.close();
      pcRef.current = null;
      supabase.removeChannel(channel);
      setRemoteLive(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, roomId, selfId, facing]);

  useEffect(() => {
    if (!open) {
      setSeconds(0);
      setStatus("Starting…");
      return;
    }
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
  };
  const toggleCam = () => {
    const next = !camOff;
    setCamOff(next);
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
  };

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[92dvh] rounded-t-3xl border-border/60 p-0 [&>button]:hidden"
      >
        <div className="relative flex h-full flex-col items-center justify-between overflow-hidden px-5 pb-8 pt-8">
          <video
            ref={remoteRef}
            autoPlay
            playsInline
            className={cn(
              "absolute inset-0 h-full w-full object-cover",
              (!remoteLive || mode !== "video") && "hidden",
            )}
          />
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "absolute right-4 top-16 z-10 h-32 w-[5.5rem] rounded-2xl border border-border/60 object-cover shadow-2xl",
              (mode !== "video" || camOff) && "hidden",
            )}
          />

          <div className="relative z-10 flex flex-col items-center text-center">
            <h2 className="font-display text-xl font-bold">{peerName}</h2>
            <p className="pt-1 text-sm text-muted-foreground">
              {status === "Connected" ? clock : status}
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <CallBtn onClick={toggleMute} label={muted ? "Unmute" : "Mute"} active={muted}>
              {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </CallBtn>
            {mode === "video" && (
              <>
                <CallBtn onClick={toggleCam} label={camOff ? "Camera on" : "Camera off"} active={camOff}>
                  {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </CallBtn>
                <CallBtn
                  onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
                  label="Switch camera"
                >
                  <SwitchCamera className="h-5 w-5" />
                </CallBtn>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="End call"
              className="grid h-14 w-14 place-items-center rounded-full bg-[oklch(0.58_0.21_25)] text-white transition-transform active:scale-90"
            >
              <PhoneOff className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CallBtn({
  onClick,
  label,
  children,
  active,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "grid h-12 w-12 place-items-center rounded-full backdrop-blur transition-transform active:scale-90",
        active ? "bg-foreground text-background" : "bg-secondary/80",
      )}
    >
      {children}
    </button>
  );
}
