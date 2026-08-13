import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  SwitchCamera,
  Image as ImageIcon,
  FolderClock,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

type Mode = "POST" | "REEL" | "LIVE";

interface CameraCaptureProps {
  onClose: () => void;
  onCapture: (files: File[]) => void;
  onPick: () => void;
  onDrafts: () => void;
}

export function CameraCapture({ onClose, onCapture, onPick, onDrafts }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);

  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [mode, setMode] = useState<Mode>("REEL");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; native: boolean }>({
    min: 1,
    max: 5,
    native: false,
  });
  const [error, setError] = useState<string | null>(null);

  /* ---------- camera boot: force highest native res + fps ---------- */
  const start = useCallback(async (mode: "user" | "environment") => {
    streamRef.current?.getTracks().forEach((t) => t.stop());

    // Probe what the device can actually deliver, then ask for exactly that.
    // Over-asking (fixed 4K/60) is the main cause of dropped frames + stutter.
    let maxW = 1920;
    let maxFps = 60;
    try {
      const probe = navigator.mediaDevices.getSupportedConstraints?.() ?? {};
      if (probe.width && probe.frameRate) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cam = devices.find((d) => d.kind === "videoinput");
        const caps = (cam as InputDeviceInfo | undefined)?.getCapabilities?.() as
          | { width?: { max: number }; frameRate?: { max: number } }
          | undefined;
        if (caps?.width?.max) maxW = Math.min(caps.width.max, 3840);
        if (caps?.frameRate?.max) maxFps = Math.min(caps.frameRate.max, 60);
      }
    } catch {
      /* capabilities unavailable — use defaults */
    }

    const audio = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    } as MediaTrackConstraints;

    const tiers: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: maxW },
          height: { ideal: Math.round((maxW * 9) / 16) },
          frameRate: { ideal: maxFps, min: 24 },
          resizeMode: "none",
        } as MediaTrackConstraints,
        audio,
      },
      {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: Math.min(maxFps, 60), min: 24 },
        },
        audio,
      },
      {
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio,
      },
      { video: { facingMode: mode }, audio: true },
      { video: true, audio: false },
    ];

    let stream: MediaStream | null = null;
    for (const c of tiers) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(c);
        break;
      } catch {
        /* try next tier */
      }
    }
    if (!stream) {
      setError("Camera permission is blocked. Enable it in your browser settings.");
      return;
    }

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => {});
    }

    const track = stream.getVideoTracks()[0];
    const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
      zoom?: { min: number; max: number };
    };
    if (caps.zoom && caps.zoom.max > caps.zoom.min) {
      setZoomRange({ min: caps.zoom.min, max: caps.zoom.max, native: true });
      setZoom(caps.zoom.min);
    } else {
      setZoomRange({ min: 1, max: 5, native: false });
      setZoom(1);
    }
    setError(null);
  }, []);

  useEffect(() => {
    void start(facing);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facing, start]);

  /* ---------- zoom (optical when available, digital fallback) ---------- */
  const applyZoom = useCallback(
    (next: number) => {
      const clamped = Math.min(zoomRange.max, Math.max(zoomRange.min, next));
      setZoom(clamped);
      if (!zoomRange.native) return;
      const track = streamRef.current?.getVideoTracks()[0];
      void track
        ?.applyConstraints({ advanced: [{ zoom: clamped } as MediaTrackConstraintSet] })
        .catch(() => {});
    },
    [zoomRange],
  );

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    pinchRef.current = { dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), zoom };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !pinchRef.current) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    applyZoom(pinchRef.current.zoom * (d / pinchRef.current.dist));
  };
  const onTouchEnd = () => {
    pinchRef.current = null;
  };

  useEffect(() => {
    const el = videoRef.current?.parentElement;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      applyZoom(zoom * Math.exp(-dy * 0.0015));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyZoom, zoom]);

  /* ---------- recording timer ---------- */
  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  const shootPhoto = () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 1080;
    canvas.height = v.videoHeight || 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (!zoomRange.native && zoom > 1) {
      const w = canvas.width / zoom;
      const h = canvas.height / zoom;
      ctx.drawImage(v, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    }
    canvas.toBlob((blob) => {
      if (!blob) return;
      onCapture([new File([blob], `yw_${Date.now()}.jpg`, { type: "image/jpeg" })]);
    }, "image/jpeg", 0.95);
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;
    // Hardware-encoder friendly order: H.264/HEVC (native encoders) first,
    // then VP9/VP8. Bitrate scales with the negotiated resolution + fps.
    const types = [
      "video/mp4;codecs=h264,aac",
      "video/mp4;codecs=avc1.640029",
      "video/mp4",
      "video/webm;codecs=h264,opus",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t));

    const s = stream.getVideoTracks()[0]?.getSettings() ?? {};
    const pixels = (s.width ?? 1920) * (s.height ?? 1080);
    const fpsFactor = (s.frameRate ?? 30) / 30;
    const videoBitsPerSecond = Math.round(
      Math.min(24_000_000, Math.max(4_000_000, pixels * 0.12 * fpsFactor)),
    );

    const rec = new MediaRecorder(
      stream,
      mimeType
        ? { mimeType, videoBitsPerSecond, audioBitsPerSecond: 128_000 }
        : { videoBitsPerSecond },
    );
    chunksRef.current = [];
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => {
      const type = rec.mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const ext = type.includes("mp4") ? "mp4" : "webm";
      onCapture([new File([blob], `yw_${Date.now()}.${ext}`, { type })]);
    };
    // Chunked timeslice keeps memory flat and avoids hitches on long takes.
    rec.start(1000);
    recorderRef.current = rec;
    setElapsed(0);
    setRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  const onShutter = () => {
    if (mode === "POST") return shootPhoto();
    if (recording) return stopRecording();
    startRecording();
  };

  const zoomPct = ((zoom - zoomRange.min) / (zoomRange.max - zoomRange.min)) * 100;

  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-black text-white select-none">
      <div
        className="absolute inset-0 touch-none"
        style={{ transform: "translateZ(0)", backfaceVisibility: "hidden", contain: "strict" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          disablePictureInPicture
          className="h-full w-full object-cover"
          style={{
            transform: `translateZ(0) ${facing === "user" ? "scaleX(-1) " : ""}scale(${zoomRange.native ? 1 : zoom})`,
            willChange: "transform",
            backfaceVisibility: "hidden",
            perspective: 1000,
            imageRendering: "auto",
          }}
        />
      </div>

      {error && (
        <div className="absolute inset-x-6 top-1/2 z-30 -translate-y-1/2 rounded-2xl bg-zinc-900/90 p-4 text-center text-xs font-semibold">
          {error}
        </div>
      )}

      {/* TOP BAR */}
      <div className="relative z-20 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4">
        <button
          onClick={onClose}
          aria-label="Close camera"
          className="rounded-full bg-black/40 p-2 backdrop-blur-md active:scale-90"
        >
          <ArrowLeft size={20} />
        </button>

        {recording && (
          <div className="flex items-center gap-2 rounded-full bg-red-500/90 px-3 py-1 text-[11px] font-black tabular-nums">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
          </div>
        )}

        <button
          onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
          aria-label="Flip camera"
          className="rounded-full bg-black/40 p-2 backdrop-blur-md active:scale-90"
        >
          <SwitchCamera size={20} />
        </button>
      </div>

      {/* VERTICAL ZOOM SLIDER */}
      <div className="absolute right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-2">
        <ZoomIn size={14} className="text-white/70" />
        <div className="relative flex h-40 w-9 items-center justify-center rounded-full border border-white/10 bg-black/35 backdrop-blur-md">
          <div className="absolute bottom-3 top-3 w-1 rounded-full bg-white/20" />
          <div
            className="absolute bottom-3 w-1 rounded-full bg-white"
            style={{ height: `calc((100% - 24px) * ${zoomPct / 100})` }}
          />
          <input
            type="range"
            aria-label="Zoom"
            min={zoomRange.min}
            max={zoomRange.max}
            step={(zoomRange.max - zoomRange.min) / 100}
            value={zoom}
            onChange={(e) => applyZoom(Number(e.target.value))}
            className="absolute h-9 w-40 origin-center -rotate-90 cursor-pointer opacity-0"
          />
        </div>
        <ZoomOut size={14} className="text-white/70" />
        <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-black tabular-nums">
          {zoom.toFixed(1)}x
        </span>
      </div>

      {/* BOTTOM CONTROLS */}
      <div className="relative z-20 flex flex-col items-center gap-4 bg-gradient-to-t from-black/80 to-transparent pb-6 pt-8">
        <div className="flex items-center gap-7 text-[11px] font-black uppercase tracking-wide">
          {(["POST", "REEL", "LIVE"] as const).map((m) => (
            <button
              key={m}
              onClick={() => !recording && setMode(m)}
              className={mode === m ? "text-white" : "text-white/50"}
            >
              {m}
              {mode === m && <span className="mx-auto mt-1 block h-1 w-1 rounded-full bg-white" />}
            </button>
          ))}
        </div>

        <div className="flex w-full items-center justify-around px-8">
          <button onClick={onPick} className="flex flex-col items-center gap-1 active:scale-90">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/25 bg-black/40 backdrop-blur-md">
              <ImageIcon size={20} />
            </span>
            <span className="text-[10px] font-bold text-white/80">Add</span>
          </button>

          <button
            onClick={onShutter}
            aria-label={recording ? "Stop recording" : "Capture"}
            className="grid h-20 w-20 place-items-center rounded-full border-4 border-white active:scale-95"
          >
            <span
              className={
                recording
                  ? "h-7 w-7 rounded-md bg-red-500 transition-all"
                  : "h-14 w-14 rounded-full bg-red-500 transition-all"
              }
            />
          </button>

          <button onClick={onDrafts} className="flex flex-col items-center gap-1 active:scale-90">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/25 bg-black/40 backdrop-blur-md">
              <FolderClock size={20} />
            </span>
            <span className="text-[10px] font-bold text-white/80">Drafts</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default CameraCapture;