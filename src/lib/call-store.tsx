import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Mic, MicOff, PhoneOff, Phone, Video, VideoOff, SwitchCamera, Zap, ZapOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CallMode = "audio" | "video";
type Phase = "idle" | "outgoing" | "incoming" | "connecting" | "active" | "ended";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
];

type CallState = {
  callId: string;
  mode: CallMode;
  peerId: string;
  peerName: string;
  incoming: boolean;
};

type Ctx = {
  startCall: (opts: {
    threadId?: string;
    peerId?: string;
    peerName?: string;
    mode: CallMode;
  }) => Promise<void>;
  /** The id other people can call you on — Supabase user id, or a temporary guest session id. */
  myCallId: string | null;
  isGuest: boolean;
};

const CallCtx = createContext<Ctx>({ startCall: async () => {}, myCallId: null, isGuest: true });
export const useCall = () => useContext(CallCtx);

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const GUEST_KEY = "yw.guest-call-id";

/** Stable per-browser temporary id so signed-out users can still ring and be rung. */
function getGuestCallId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(GUEST_KEY);
    if (existing) return existing;
    const fresh = `guest-${uid()}`;
    window.localStorage.setItem(GUEST_KEY, fresh);
    return fresh;
  } catch {
    return `guest-${uid()}`;
  }
}

/** Simple WebAudio ringtone so incoming calls actually ring on the device. */
function useRingtone(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    let stopped = false;
    let ctx: AudioContext | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    try {
      const AC = window.AudioContext ?? (window as any).webkitAudioContext;
      ctx = new AC();
      const beep = () => {
        if (!ctx || stopped) return;
        const now = ctx.currentTime;
        [0, 0.4].forEach((offset) => {
          const osc = ctx!.createOscillator();
          const gain = ctx!.createGain();
          osc.type = "sine";
          osc.frequency.value = 440;
          gain.gain.setValueAtTime(0.0001, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.32);
          osc.connect(gain).connect(ctx!.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.35);
        });
      };
      void ctx.resume();
      beep();
      timer = setInterval(beep, 2000);
    } catch {
      /* audio blocked — UI still shows the incoming call */
    }
    if (navigator.vibrate) {
      try {
        navigator.vibrate([400, 300, 400, 300, 400]);
      } catch { /* ignore */ }
    }
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      void ctx?.close();
      if (navigator.vibrate) {
        try { navigator.vibrate(0); } catch { /* ignore */ }
      }
    };
  }, [active]);
}

export function CallProvider({ children }: { children: ReactNode }) {
  const [authId, setAuthId] = useState<string | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const me = authId ?? guestId;
  const isGuest = !authId;
  const [call, setCall] = useState<CallState | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [flashOn, setFlashOn] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const sigRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const localVideo = useRef<HTMLVideoElement | null>(null);
  const remoteVideo = useRef<HTMLVideoElement | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);

  useRingtone(phase === "incoming");

  /* ---------- identity ---------- */
  useEffect(() => {
    setGuestId(getGuestCallId());
    void supabase.auth.getUser().then(({ data }) => setAuthId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  /* ---------- teardown ---------- */
  const teardown = useCallback(() => {
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    remoteStream.current = null;
    try { pcRef.current?.close(); } catch { /* ignore */ }
    pcRef.current = null;
    if (sigRef.current) {
      void supabase.removeChannel(sigRef.current);
      sigRef.current = null;
    }
    pendingIce.current = [];
    setPhase("idle");
    setCall(null);
    setMicOn(true);
    setCamOn(true);
  }, []);

  const signal = useCallback((payload: Record<string, unknown>) => {
    sigRef.current?.send({ type: "broadcast", event: "signal", payload });
  }, []);

  const attachStreams = useCallback(() => {
    if (localVideo.current && localStream.current) {
      localVideo.current.srcObject = localStream.current;
      void localVideo.current.play().catch(() => {});
    }
    if (remoteStream.current) {
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = remoteStream.current;
        void remoteVideo.current.play().catch(() => {});
      }
      if (remoteAudio.current) {
        remoteAudio.current.srcObject = remoteStream.current;
        void remoteAudio.current.play().catch(() => {});
      }
    }
  }, []);

  const getMedia = useCallback(async (mode: CallMode) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mode === "video" ? { facingMode: "user", width: { ideal: 1280 } } : false,
    });
    localStream.current = stream;
    attachStreams();
    return stream;
  }, [attachStreams]);

  const createPeer = useCallback(
    (stream: MediaStream) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      pc.onicecandidate = (e) => {
        if (e.candidate) signal({ type: "ice", candidate: e.candidate.toJSON() });
      };
      pc.ontrack = (e) => {
        const [s] = e.streams;
        if (s) {
          remoteStream.current = s;
          attachStreams();
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setPhase("active");
        if (pc.connectionState === "failed") {
          toast.error("Call connection failed");
          teardown();
        }
      };
      return pc;
    },
    [signal, attachStreams, teardown],
  );

  const flushIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    for (const c of pendingIce.current) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
    }
    pendingIce.current = [];
  }, []);

  /* ---------- signalling channel for one call ---------- */
  const openSignalChannel = useCallback(
    (callId: string, mode: CallMode, isCaller: boolean) =>
      new Promise<void>((resolve) => {
        const ch = supabase.channel(`rtc-${callId}`, { config: { broadcast: { self: false } } });
        sigRef.current = ch;
        ch.on("broadcast", { event: "signal" }, async ({ payload }) => {
          const pc = pcRef.current;
          try {
            if (payload.type === "accept" && isCaller) {
              setPhase("connecting");
              const stream = localStream.current ?? (await getMedia(mode));
              const peer = pcRef.current ?? createPeer(stream);
              const offer = await peer.createOffer();
              await peer.setLocalDescription(offer);
              signal({ type: "offer", sdp: peer.localDescription });
            } else if (payload.type === "offer" && !isCaller) {
              const stream = localStream.current ?? (await getMedia(mode));
              const peer = pcRef.current ?? createPeer(stream);
              await peer.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              await flushIce();
              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);
              signal({ type: "answer", sdp: peer.localDescription });
              setPhase("connecting");
            } else if (payload.type === "answer" && pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              await flushIce();
            } else if (payload.type === "ice") {
              if (pc?.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } else {
                pendingIce.current.push(payload.candidate);
              }
            } else if (payload.type === "end") {
              toast.message("Call ended");
              teardown();
            } else if (payload.type === "decline") {
              toast.message("Call declined");
              teardown();
            }
          } catch (err) {
            console.error("[call] signal error", err);
          }
        }).subscribe((status) => {
          if (status === "SUBSCRIBED") resolve();
        });
      }),
    [createPeer, flushIce, getMedia, signal, teardown],
  );

  /* ---------- incoming ring listener (per user) ---------- */
  useEffect(() => {
    if (!me) return;
    let ch: ReturnType<typeof supabase.channel> | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let alive = true;
    const seen = new Set<string>();

    const listen = () => {
      if (!alive) return;
      ch = supabase
        .channel(`calls-user-${me}`, { config: { broadcast: { self: false } } })
        .on("broadcast", { event: "ring" }, ({ payload }) => {
        if (!payload?.callId || seen.has(payload.callId)) return;
        seen.add(payload.callId);
        if (pcRef.current || phaseRef.current !== "idle") {
          // already busy — tell the caller
          supabase.channel(`rtc-${payload.callId}`).subscribe((s) => {
            if (s === "SUBSCRIBED") {
              void supabase
                .channel(`rtc-${payload.callId}`)
                .send({ type: "broadcast", event: "signal", payload: { type: "decline" } });
            }
          });
          return;
        }
        setCall({
          callId: payload.callId,
          mode: payload.mode,
          peerId: payload.fromId,
          peerName: payload.fromName ?? "Incoming call",
          incoming: true,
        });
        setPhase("incoming");
      })
        .on("broadcast", { event: "cancel" }, () => {
        if (phaseRef.current === "incoming") {
          toast.message("Missed call");
          teardown();
        }
      })
        .subscribe((status) => {
          // Rejoin automatically so a dropped socket never silences incoming calls.
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            if (ch) void supabase.removeChannel(ch);
            ch = null;
            if (alive) retry = setTimeout(listen, 1500);
          }
        });
    };
    listen();

    const wake = () => {
      if (document.visibilityState === "visible" && !ch) listen();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);

    return () => {
      alive = false;
      if (retry) clearTimeout(retry);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
      if (ch) void supabase.removeChannel(ch);
    };
  }, [me, teardown]);

  const phaseRef = useRef<Phase>("idle");
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  /* ---------- start an outgoing call ---------- */
  const startCall = useCallback<Ctx["startCall"]>(
    async ({ threadId, peerId, peerName, mode }) => {
      if (!me) {
        toast.error("Calling isn't ready yet — try again in a moment");
        return;
      }
      let target = peerId ?? null;
      if (!target && threadId && !isGuest) {
        const { data } = await supabase
          .from("thread_participants")
          .select("user_id")
          .eq("thread_id", threadId);
        target = (data ?? []).map((r) => r.user_id).find((id) => id !== me) ?? null;
      }
      if (!target) {
        toast.error(
          isGuest
            ? "Guest calls need the other person's call ID"
            : "This person isn't reachable for calls yet",
        );
        return;
      }

      const callId = uid();
      let myName = "Guest";
      if (!isGuest) {
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("id", me)
          .maybeSingle();
        myName = myProfile?.display_name || myProfile?.username || "Someone";
      }
      setCall({ callId, mode, peerId: target, peerName: peerName ?? "Calling…", incoming: false });
      setPhase("outgoing");

      try {
        await getMedia(mode);
      } catch {
        toast.error("Camera / microphone permission denied");
        teardown();
        return;
      }
      createPeer(localStream.current!);
      await openSignalChannel(callId, mode, true);

      const ring = supabase.channel(`calls-user-${target}`, {
        config: { broadcast: { self: false } },
      });
      ring.subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        const payload = { callId, mode, fromId: me, fromName: myName, threadId };
        // Re-send a few times: the receiver may still be re-joining its channel.
        let sent = 0;
        const fire = () => {
          if (phaseRef.current !== "outgoing") {
            clearInterval(timer);
            void supabase.removeChannel(ring);
            return;
          }
          void ring.send({ type: "broadcast", event: "ring", payload });
          if (++sent >= 5) {
            clearInterval(timer);
            setTimeout(() => void supabase.removeChannel(ring), 500);
          }
        };
        const timer = setInterval(fire, 1200);
        fire();
      });
    },
    [me, isGuest, getMedia, createPeer, openSignalChannel, teardown],
  );

  const accept = useCallback(async () => {
    if (!call) return;
    setPhase("connecting");
    try {
      await getMedia(call.mode);
    } catch {
      toast.error("Camera / microphone permission denied");
      teardown();
      return;
    }
    createPeer(localStream.current!);
    await openSignalChannel(call.callId, call.mode, false);
    signal({ type: "accept" });
  }, [call, getMedia, createPeer, openSignalChannel, signal, teardown]);

  const hangup = useCallback(async () => {
    if (call && phase === "incoming") {
      const ch = supabase.channel(`rtc-${call.callId}`);
      ch.subscribe((s) => {
        if (s === "SUBSCRIBED") {
          void ch
            .send({ type: "broadcast", event: "signal", payload: { type: "decline" } })
            .finally(() => setTimeout(() => void supabase.removeChannel(ch), 500));
        }
      });
    } else if (call) {
      signal({ type: "end" });
      const cancel = supabase.channel(`calls-user-${call.peerId}`);
      cancel.subscribe((s) => {
        if (s === "SUBSCRIBED") {
          void cancel
            .send({ type: "broadcast", event: "cancel", payload: { callId: call.callId } })
            .finally(() => setTimeout(() => void supabase.removeChannel(cancel), 500));
        }
      });
    }
    teardown();
  }, [call, phase, signal, teardown]);

  const toggleMic = () => {
    const track = localStream.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  };
  const toggleCam = () => {
    const track = localStream.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
    }
  };

  useEffect(() => () => teardown(), [teardown]);

  const value = useMemo(
    () => ({ startCall, myCallId: me, isGuest }),
    [startCall, me, isGuest],
  );

  const statusText =
    phase === "incoming"
      ? `Incoming ${call?.mode === "video" ? "video" : "voice"} call…`
      : phase === "outgoing"
        ? "Ringing…"
        : phase === "connecting"
          ? "Connecting…"
          : "Connected";

  return (
    <CallCtx.Provider value={value}>
      {children}
      {call && phase !== "idle" && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-between bg-zinc-950 p-6 text-white">
          {call.mode === "video" && (
            <>
              <video
                ref={remoteVideo}
                autoPlay
                playsInline
                className="absolute inset-0 z-0 h-full w-full object-cover"
              />
              <video
                ref={localVideo}
                autoPlay
                playsInline
                muted
                className="absolute right-4 top-4 z-10 h-40 w-28 rounded-2xl border border-white/20 object-cover"
              />
            </>
          )}
          <audio ref={remoteAudio} autoPlay className="hidden" />

          <div className="relative z-10 mt-12 flex flex-col gap-1 px-2">
            <h2 className="text-lg font-bold drop-shadow-lg">{call.peerName}</h2>
            <span className="animate-pulse text-xs font-bold text-emerald-400 drop-shadow-lg">{statusText}</span>
          </div>

          <div className="relative z-10 mb-10 flex items-center justify-center gap-6">
            {phase === "incoming" ? (
              <>
                <button
                  onClick={() => void hangup()}
                  className="rounded-full bg-red-600 p-5 active:scale-90"
                  aria-label="Decline call"
                >
                  <PhoneOff size={26} />
                </button>
                <button
                  onClick={() => void accept()}
                  className="animate-bounce rounded-full bg-emerald-600 p-5 active:scale-90"
                  aria-label="Accept call"
                >
                  <Phone size={26} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={toggleMic}
                  className={`rounded-full p-4 backdrop-blur-md ${micOn ? "bg-zinc-800/80" : "bg-red-600"}`}
                  aria-label="Toggle microphone"
                >
                  {micOn ? <Mic size={22} /> : <MicOff size={22} />}
                </button>
                {call.mode === "video" && (
                  <button
                    onClick={toggleCam}
                    className={`rounded-full p-4 backdrop-blur-md ${camOn ? "bg-zinc-800/80" : "bg-red-600"}`}
                    aria-label="Toggle camera"
                  >
                    {camOn ? <Video size={22} /> : <VideoOff size={22} />}
                  </button>
                )}
                <button
                  onClick={() => void hangup()}
                  className="rounded-full bg-red-600 p-5 active:scale-90"
                  aria-label="End call"
                >
                  <PhoneOff size={26} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </CallCtx.Provider>
  );
}
