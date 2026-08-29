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
import { Mic, MicOff, PhoneOff, Phone, Video, VideoOff, SwitchCamera, Zap, ZapOff, Volume2, VolumeX } from "lucide-react";
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
  /** Social chat thread the call was started from (when known). */
  threadId?: string | null;
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
  /** WhatsApp-style: tap the PiP to swap which stream fills the screen. */
  const [swapped, setSwapped] = useState(false);
  const [peerAvatar, setPeerAvatar] = useState<string | null>(null);
  /** Auto-hiding call controls: visible on activity, hidden after 3s. */
  const [controlsVisible, setControlsVisible] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const hideTimer = useRef<number | null>(null);


  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const sigRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const localVideo = useRef<HTMLVideoElement | null>(null);
  const remoteVideo = useRef<HTMLVideoElement | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  /** Call ids we've already reacted to (broadcast + database ring paths). */
  const seenCalls = useRef<Set<string>>(new Set());
  /** Set when the peer connection reaches "connected" — used for call duration. */
  const connectedAt = useRef<number | null>(null);
  /** Ensures the call-log chat message is written exactly once per call. */
  const loggedCall = useRef<string | null>(null);


  useRingtone(
    phase === "incoming" ? "incoming" : phase === "outgoing" ? "ringback" : null,
  );

  /* ---------- auto-hiding controls (Social + Orbit video calls) ---------- */
  useEffect(() => {
    if (!call || phase === "idle" || phase === "incoming") {
      setControlsVisible(true);
      return;
    }
    setControlsVisible(true);
    hideTimer.current = window.setTimeout(() => setControlsVisible(false), 3000);
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [call?.callId, phase]);

  const pokeControls = useCallback(() => {
    setControlsVisible((v) => {
      const next = !v;
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (next) hideTimer.current = window.setTimeout(() => setControlsVisible(false), 3000);
      return next;
    });
  }, []);

  const toggleSpeaker = useCallback(() => {
    setSpeakerOn((on) => {
      const next = !on;
      if (remoteAudio.current) remoteAudio.current.muted = !next;
      if (remoteVideo.current) remoteVideo.current.muted = true; // video element stays silent; audio via <audio>
      return next;
    });
  }, []);

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
    // Release the remote tracks too, otherwise the camera/mic indicator can
    // linger and the streams stay referenced by the media elements.
    remoteStream.current?.getTracks().forEach((t) => t.stop());
    remoteStream.current = null;
    for (const el of [localVideo.current, remoteVideo.current, remoteAudio.current]) {
      if (el) {
        try { el.pause(); } catch { /* ignore */ }
        el.srcObject = null;
      }
    }
    const pc = pcRef.current;
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.getSenders().forEach((s) => s.track?.stop());
      try { pc.close(); } catch { /* ignore */ }
    }
    pcRef.current = null;
    if (sigRef.current) {
      void supabase.removeChannel(sigRef.current);
      sigRef.current = null;
    }
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    pendingIce.current = [];
    setPhase("idle");
    setCall(null);
    setMicOn(true);
    setCamOn(true);
    setFacingMode("user");
    setFlashOn(false);
    setSwapped(false);
    setControlsVisible(true);
  }, []);

  const signal = useCallback((payload: Record<string, unknown>) => {
    sigRef.current?.send({ type: "broadcast", event: "signal", payload });
  }, []);

  /**
   * Sends a broadcast over REST instead of joining the topic.
   * Realtime RLS only lets you *read* your own `calls-user-<id>` topic, so a
   * caller can never subscribe to the callee's ring topic — but it may write
   * to it. REST delivery uses only that write permission, which makes rings,
   * cancels and declines arrive instantly in both Social and Orbit chats.
   */
  const httpBroadcast = useCallback(
    async (topic: string, event: string, payload: Record<string, unknown>) => {
      const ch = supabase.channel(topic, { config: { private: true } });
      try {
        const { data } = await supabase.auth.getSession();
        await supabase.realtime.setAuth(data.session?.access_token);
        await ch.httpSend(event, payload);
      } catch (err) {
        console.error("[call] broadcast failed", topic, event, err);
      } finally {
        void supabase.removeChannel(ch);
      }
    },
    [],
  );


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
        // Some browsers deliver tracks without a stream — build one ourselves so
        // both the audio and video tracks always reach the <audio>/<video> tags.
        let s = e.streams[0] ?? remoteStream.current;
        if (!s) s = new MediaStream();
        if (!e.streams[0] && !s.getTracks().includes(e.track)) s.addTrack(e.track);
        remoteStream.current = s;
        // Explicitly attach the received remote stream to the main full-screen
        // <video> element immediately, then retry on the next frame in case the
        // ref wasn't bound yet (e.g. track arrives before the element mounts).
        const attachNow = () => {
          if (remoteVideo.current) {
            remoteVideo.current.srcObject = s;
            void remoteVideo.current.play().catch(() => {});
          }
          if (remoteAudio.current) {
            remoteAudio.current.srcObject = s;
            void remoteAudio.current.play().catch(() => {});
          }
        };
        attachNow();
        requestAnimationFrame(attachNow);
        requestAnimationFrame(() => requestAnimationFrame(attachNow));
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
        if (!payload?.callId || seenCalls.current.has(payload.callId)) return;
        // Only accept rings whose signalling topic we are actually a participant of.
        if (!String(payload.callId).includes(me)) return;
        seenCalls.current.add(payload.callId);
        if (pcRef.current || phaseRef.current !== "idle") {
          // already busy — tell the caller
          void httpBroadcast(`rtc-${payload.callId}`, "signal", { type: "decline" });
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
        toast.message(
          `Incoming ${payload.mode === "video" ? "video" : "voice"} call`,
          { description: payload.fromName ?? "Someone is calling you" },
        );

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
  }, [me, teardown, httpBroadcast]);

  const phaseRef = useRef<Phase>("idle");
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  const callRef = useRef<CallState | null>(null);
  useEffect(() => { callRef.current = call; }, [call]);

  /* ---------- durable ring listener (database, works app-wide) ---------- */
  useEffect(() => {
    if (!authId) return;
    const me2 = authId;
    const ch = supabase
      .channel(`calls-db-${me2}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "calls", filter: `callee_id=eq.${me2}` },
        ({ new: row }: { new: Record<string, unknown> }) => {
          const callId = String(row.call_id ?? "");
          if (!callId || seenCalls.current.has(callId)) return;
          if (row.status !== "ringing") return;
          // Ignore stale rows (e.g. replayed after a reconnect).
          const age = Date.now() - new Date(String(row.created_at)).getTime();
          if (age > 60_000) return;
          seenCalls.current.add(callId);
          if (pcRef.current || phaseRef.current !== "idle") {
            void supabase.from("calls").update({ status: "declined" }).eq("call_id", callId);
            void httpBroadcast(`rtc-${callId}`, "signal", { type: "decline" });
            return;
          }
          const mode = (row.mode === "video" ? "video" : "audio") as CallMode;
          setCall({
            callId,
            mode,
            peerId: String(row.caller_id),
            peerName: (row.caller_name as string) || "Incoming call",
            incoming: true,
          });
          setPhase("incoming");
          toast.message(`Incoming ${mode === "video" ? "video" : "voice"} call`, {
            description: (row.caller_name as string) || "Someone is calling you",
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls", filter: `callee_id=eq.${me2}` },
        ({ new: row }: { new: Record<string, unknown> }) => {
          const callId = String(row.call_id ?? "");
          const status = String(row.status ?? "");
          if (phaseRef.current !== "incoming") return;
          if (callId !== callRef.current?.callId) return;
          if (status === "ended" || status === "cancelled") {
            toast.message("Missed call");
            teardown();
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [authId, teardown, httpBroadcast]);


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

      // Embed both participant ids in the call id so the realtime RLS policy can
      // verify the subscriber is actually part of this specific call.
      const callId = `${[me, target].sort().join(".")}.${uid()}`;
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

      const ringPayload = { callId, mode, fromId: me, fromName: myName, threadId };
      seenCalls.current.add(callId);
      // Durable ring: a row the callee's realtime subscription always receives,
      // so the incoming-call screen pops app-wide (WhatsApp / Instagram style).
      if (!isGuest) {
        void supabase.from("calls").insert({
          call_id: callId,
          caller_id: me,
          callee_id: target,
          caller_name: myName,
          mode,
          thread_id: threadId ?? null,
          status: "ringing",
        });
      }
      void httpBroadcast(`calls-user-${target}`, "ring", ringPayload);

      // Re-send a few times: the receiver may still be re-joining its channel.
      let sent = 1;
      const timer = window.setInterval(() => {
        if (phaseRef.current !== "outgoing" || sent >= 4) {
          window.clearInterval(timer);
          return;
        }
        sent++;
        void httpBroadcast(`calls-user-${target}`, "ring", ringPayload);
      }, 1500);
    },
    [me, isGuest, getMedia, createPeer, openSignalChannel, teardown, httpBroadcast],

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
      void httpBroadcast(`rtc-${call.callId}`, "signal", { type: "decline" });
      void supabase
        .from("calls")
        .update({ status: "declined" })
        .eq("call_id", call.callId);
    } else if (call) {
      signal({ type: "end" });
      void httpBroadcast(`rtc-${call.callId}`, "signal", { type: "end" });
      void httpBroadcast(`calls-user-${call.peerId}`, "cancel", { callId: call.callId });
      void supabase.from("calls").update({ status: "ended" }).eq("call_id", call.callId);
    }
    teardown();
  }, [call, phase, signal, teardown, httpBroadcast]);



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

  // Re-bind media to the elements whenever the call UI (re)mounts, so late
  // remote tracks and the local preview always show up on both sides.
  useEffect(() => {
    if (!call || phase === "idle") return;
    attachStreams();
    const t = window.setTimeout(attachStreams, 250);
    return () => window.clearTimeout(t);
  }, [call, phase, attachStreams]);

  // Reset the swap + load the peer avatar for the premium incoming screen.
  useEffect(() => {
    setSwapped(false);
    setPeerAvatar(null);
    const peerId = call?.peerId;
    if (!peerId || peerId.startsWith("guest-")) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", peerId)
        .maybeSingle();
      if (!cancelled && data?.avatar_url) setPeerAvatar(data.avatar_url);
    })();
    return () => {
      cancelled = true;
    };
  }, [call?.peerId]);

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
        <div
          className="fixed inset-0 z-[100] flex flex-col justify-between bg-zinc-950 p-6 text-white"
          onClick={phase === "incoming" ? undefined : pokeControls}
        >
          {call.mode === "video" && (
            <>
              <video
                ref={remoteVideo}
                autoPlay
                playsInline
                muted
                onClick={
                  swapped
                    ? (e) => { e.stopPropagation(); setSwapped(false); }
                    : undefined
                }
                className={
                  swapped
                    ? "absolute right-4 top-28 z-20 h-40 w-28 cursor-pointer rounded-2xl border border-white/20 object-cover shadow-2xl transition-all active:scale-95"
                    : "absolute inset-0 z-0 h-full w-full object-cover"
                }
              />
              <video
                ref={localVideo}
                autoPlay
                playsInline
                muted
                onClick={
                  swapped
                    ? undefined
                    : (e) => { e.stopPropagation(); setSwapped(true); }
                }
                className={
                  swapped
                    ? "absolute inset-0 z-0 h-full w-full object-cover"
                    : "absolute right-4 top-28 z-20 h-40 w-28 cursor-pointer rounded-2xl border border-white/20 object-cover shadow-2xl transition-all active:scale-95"
                }
              />
              {phase !== "incoming" && (
                <div
                  className={`absolute right-3 top-3 z-[9999] flex items-center gap-2 rounded-full border border-white/15 bg-black/40 p-1.5 shadow-lg backdrop-blur-xl transition-all duration-300 ${
                    controlsVisible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => void flipCamera()}
                    className="grid h-9 w-9 place-items-center rounded-full text-white/90 transition-colors hover:bg-white/10 active:scale-90"
                    aria-label="Flip camera"
                  >
                    <SwitchCamera size={17} />
                  </button>
                  <button
                    onClick={() => void toggleFlash()}
                    className="grid h-9 w-9 place-items-center rounded-full text-white/90 transition-colors hover:bg-white/10 active:scale-90"
                    aria-label="Toggle flashlight"
                  >
                    {flashOn ? <Zap size={17} className="text-yellow-400" /> : <ZapOff size={17} />}
                  </button>
                  <button
                    onClick={toggleSpeaker}
                    className="grid h-9 w-9 place-items-center rounded-full text-white/90 transition-colors hover:bg-white/10 active:scale-90"
                    aria-label="Toggle speaker"
                  >
                    {speakerOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
                  </button>
                </div>
              )}
            </>
          )}

          <audio ref={remoteAudio} autoPlay className="hidden" />

          {phase === "incoming" ? (
            <>
              {/* Blurred caller backdrop */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                {peerAvatar ? (
                  <img
                    src={peerAvatar}
                    alt=""
                    aria-hidden
                    className="h-full w-full scale-125 object-cover opacity-60 blur-3xl"
                  />
                ) : (
                  <div className="h-full w-full bg-[radial-gradient(circle_at_50%_30%,rgba(16,185,129,0.35),transparent_65%)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/85" />
              </div>

              <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6">
                <div className="relative flex h-40 w-40 items-center justify-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20" />
                  <span
                    className="absolute inset-4 animate-ping rounded-full bg-emerald-400/25"
                    style={{ animationDelay: "0.6s" }}
                  />
                  <span className="absolute inset-6 rounded-full ring-1 ring-white/25" />
                  {peerAvatar ? (
                    <img
                      src={peerAvatar}
                      alt={call.peerName}
                      className="relative h-28 w-28 rounded-full object-cover shadow-[0_0_40px_rgba(16,185,129,0.45)]"
                    />
                  ) : (
                    <div className="relative grid h-28 w-28 place-items-center rounded-full bg-white/10 text-4xl font-bold backdrop-blur-md shadow-[0_0_40px_rgba(16,185,129,0.45)]">
                      {call.peerName?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center gap-2">
                  <h2 className="text-2xl font-semibold tracking-tight drop-shadow-lg">
                    {call.peerName}
                  </h2>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-md">
                    {call.mode === "video" ? "Incoming video call" : "Incoming voice call"}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div
              className={`relative z-10 mt-12 flex flex-col gap-1 px-2 transition-opacity duration-300 ${
                controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <h2 className="text-lg font-bold drop-shadow-lg">{call.peerName}</h2>
              <span className="animate-pulse text-xs font-bold text-emerald-400 drop-shadow-lg">{statusText}</span>
            </div>
          )}

          <div className="relative z-10 mb-10 flex items-center justify-center gap-6">
            {phase === "incoming" ? (
              <div className="flex w-full items-center justify-between px-6">
                <button
                  onClick={() => void hangup()}
                  className="flex flex-col items-center gap-2"
                  aria-label="Decline call"
                >
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-red-600 shadow-[0_10px_30px_-6px_rgba(220,38,38,0.8)] transition-transform active:scale-90">
                    <PhoneOff size={26} />
                  </span>
                  <span className="text-xs text-white/70">Decline</span>
                </button>
                <button
                  onClick={() => void accept()}
                  className="flex flex-col items-center gap-2"
                  aria-label="Accept call"
                >
                  <span className="grid h-16 w-16 animate-bounce place-items-center rounded-full bg-emerald-500 shadow-[0_10px_30px_-6px_rgba(16,185,129,0.85)] transition-transform active:scale-90">
                    <Phone size={26} />
                  </span>
                  <span className="text-xs text-white/70">Accept</span>
                </button>
              </div>
            ) : (
              <div
                className={`flex items-center gap-4 rounded-full border border-white/10 bg-black/40 px-4 py-2.5 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
                  controlsVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={toggleMic}
                  className={`grid h-11 w-11 place-items-center rounded-full transition-all active:scale-90 ${
                    micOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-600 text-white"
                  }`}
                  aria-label="Toggle microphone"
                >
                  {micOn ? <Mic size={19} /> : <MicOff size={19} />}
                </button>
                {call.mode === "video" && (
                  <button
                    onClick={toggleCam}
                    className={`grid h-11 w-11 place-items-center rounded-full transition-all active:scale-90 ${
                      camOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-600 text-white"
                    }`}
                    aria-label="Toggle camera"
                  >
                    {camOn ? <Video size={19} /> : <VideoOff size={19} />}
                  </button>
                )}
                <button
                  onClick={() => void hangup()}
                  className="grid h-12 w-12 place-items-center rounded-full bg-red-600 text-white shadow-[0_8px_24px_-6px_rgba(220,38,38,0.8)] transition-transform active:scale-90"
                  aria-label="End call"
                >
                  <PhoneOff size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </CallCtx.Provider>
  );
}
