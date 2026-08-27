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

/** Builds a looping ring tone as a WAV data URL playable by an HTML5 <audio> element. */
function buildRingToneUrl(freqs: number[], onSec: number, cycleSec: number): string {
  const rate = 22050;
  const total = Math.floor(rate * cycleSec);
  const bytes = 44 + total * 2;
  const buf = new ArrayBuffer(bytes);
  const view = new DataView(buf);
  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  str(0, "RIFF"); view.setUint32(4, bytes - 8, true); str(8, "WAVEfmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  str(36, "data"); view.setUint32(40, total * 2, true);
  for (let i = 0; i < total; i++) {
    const t = i / rate;
    let v = 0;
    if (t < onSec) {
      for (const f of freqs) v += Math.sin(2 * Math.PI * f * t);
      v /= freqs.length;
      // short fades to avoid clicks
      const fade = Math.min(1, t / 0.02, (onSec - t) / 0.02);
      v *= Math.max(0, fade) * 0.35;
    }
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 32767, true);
  }
  let bin = "";
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return `data:audio/wav;base64,${btoa(bin)}`;
}

let incomingUrl: string | null = null;
let ringbackUrl: string | null = null;

/** HTML5 <audio> ringtone: incoming ring, or ringback while our outgoing call connects. */
function useRingtone(kind: "incoming" | "ringback" | null) {
  useEffect(() => {
    if (!kind || typeof window === "undefined") return;
    let audio: HTMLAudioElement | null = null;
    try {
      if (kind === "incoming") {
        incomingUrl ??= buildRingToneUrl([440, 480], 1.2, 3);
      } else {
        ringbackUrl ??= buildRingToneUrl([440, 480], 1, 4);
      }
      audio = new Audio(kind === "incoming" ? incomingUrl! : ringbackUrl!);
      audio.loop = true;
      audio.volume = kind === "incoming" ? 1 : 0.6;
      void audio.play().catch(() => {});
    } catch {
      /* audio blocked — UI still shows the call */
    }
    if (kind === "incoming" && navigator.vibrate) {
      try {
        navigator.vibrate([400, 300, 400, 300, 400]);
      } catch { /* ignore */ }
    }
    return () => {
      if (audio) {
        audio.pause();
        audio.src = "";
      }
      if (navigator.vibrate) {
        try { navigator.vibrate(0); } catch { /* ignore */ }
      }
    };
  }, [kind]);
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

  useRingtone(
    phase === "incoming" ? "incoming" : phase === "outgoing" ? "ringback" : null,
  );

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
    setFacingMode("user");
    setFlashOn(false);
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
      video: mode === "video" ? { facingMode, width: { ideal: 1280 } } : false,
    });
    localStream.current = stream;
    attachStreams();
    return stream;
  }, [attachStreams, facingMode]);

  const createPeer = useCallback(
    (stream: MediaStream) => {
      // Pre-gather ICE candidates so the call connects near-instantly.
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 4 });
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
      new Promise<void>(async (resolve) => {
        const { data: sess } = await supabase.auth.getSession();
        await supabase.realtime.setAuth(sess.session?.access_token);
        const ch = supabase.channel(`rtc-${callId}`, {
          config: { broadcast: { self: false }, private: true },
        });
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
    let connecting = false;
    const seen = new Set<string>();

    const listen = async () => {
      if (!alive || connecting || ch) return;
      connecting = true;
      // Private channels are authorized against realtime.messages RLS.
      const { data } = await supabase.auth.getSession();
      if (!alive) {
        connecting = false;
        return;
      }
      await supabase.realtime.setAuth(data.session?.access_token);
      if (!alive) {
        connecting = false;
        return;
      }
      const nextChannel = supabase
        .channel(`calls-user-${me}`, { config: { broadcast: { self: false }, private: true } })
        .on("broadcast", { event: "ring" }, ({ payload }) => {
        if (!payload?.callId || seen.has(payload.callId)) return;
        seen.add(payload.callId);
        if (pcRef.current || phaseRef.current !== "idle") {
          // already busy — tell the caller
          supabase.channel(`rtc-${payload.callId}`, { config: { private: true } }).subscribe((s) => {
            if (s === "SUBSCRIBED") {
              void supabase
                .channel(`rtc-${payload.callId}`, { config: { private: true } })
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
          if (status === "SUBSCRIBED") connecting = false;
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            // Clear our reference before any cleanup. Calling removeChannel while
            // handling CLOSED synchronously emits CLOSED again in some mobile
            // browsers, which previously caused a recursive stack overflow.
            if (ch === nextChannel) ch = null;
            connecting = false;
            if (status !== "CLOSED") {
              window.setTimeout(() => void supabase.removeChannel(nextChannel), 0);
            }
            if (alive && !retry) {
              retry = setTimeout(() => {
                retry = null;
                void listen();
              }, 1500);
            }
          }
        });
      ch = nextChannel;
    };
    void listen();

    const wake = () => {
      if (document.visibilityState === "visible" && !ch && !connecting) void listen();
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
        config: { broadcast: { self: false }, private: true },
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
      const ch = supabase.channel(`rtc-${call.callId}`, { config: { private: true } });
      ch.subscribe((s) => {
        if (s === "SUBSCRIBED") {
          void ch
            .send({ type: "broadcast", event: "signal", payload: { type: "decline" } })
            .finally(() => setTimeout(() => void supabase.removeChannel(ch), 500));
        }
      });
    } else if (call) {
      signal({ type: "end" });
      const cancel = supabase.channel(`calls-user-${call.peerId}`, {
        config: { private: true },
      });
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

  const toggleFlash = useCallback(async () => {
    const track = localStream.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({
        advanced: [{ torch: !flashOn } as MediaTrackConstraintSet],
      } as MediaTrackConstraints);
      setFlashOn(!flashOn);
    } catch {
      toast.error("Flashlight not supported on this device");
    }
  }, [flashOn]);

  const flipCamera = useCallback(async () => {
    const next = facingMode === "user" ? "environment" : "user";
    const oldTrack = localStream.current?.getVideoTracks()[0] ?? null;
    // Most phones can't open both cameras at once — release the old one first.
    if (oldTrack) {
      oldTrack.stop();
      localStream.current?.removeTrack(oldTrack);
    }
    setFlashOn(false);
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: next }, width: { ideal: 1280 } },
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const sender = pcRef.current
        ?.getSenders()
        .find((s) => s.track?.kind === "video");
      if (sender && newVideoTrack) {
        await sender.replaceTrack(newVideoTrack);
      }
      if (localStream.current && newVideoTrack) {
        localStream.current.addTrack(newVideoTrack);
      }
      setFacingMode(next);
      attachStreams();
    } catch {
      toast.error("Couldn't switch camera");
      // try to restore the previous camera so the call keeps video
      try {
        const back = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 } },
        });
        const t = back.getVideoTracks()[0];
        const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === "video");
        if (sender && t) await sender.replaceTrack(t);
        if (localStream.current && t) localStream.current.addTrack(t);
        attachStreams();
      } catch { /* ignore */ }
    }
  }, [facingMode, attachStreams]);

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
                className="absolute right-4 top-28 z-10 h-40 w-28 rounded-2xl border border-white/20 object-cover"
              />
              {phase !== "incoming" && (
                <div className="absolute right-4 top-4 z-[9999] flex gap-3">
                  <button
                    onClick={() => void toggleFlash()}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white backdrop-blur-md active:scale-90"
                    aria-label="Toggle flashlight"
                  >
                    {flashOn ? <Zap size={22} className="text-yellow-400" /> : <ZapOff size={22} />}
                  </button>
                  <button
                    onClick={() => void flipCamera()}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white backdrop-blur-md active:scale-90"
                    aria-label="Flip camera"
                  >
                    <SwitchCamera size={22} />
                  </button>
                </div>
              )}
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
