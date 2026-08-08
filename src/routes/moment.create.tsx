import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Video as VideoIcon,
  Type,
  Music2,
  Smile,
  MapPin,
  AtSign,
  Sparkles,
  Wand2,
  Eraser,
  Repeat,
  Timer,
  Rewind,
  Clapperboard,
  Lock,
  Download,
  BarChart3,
  Bell,
  X,
  Check,
  Image as ImageIcon,
  SwitchCamera,
  Pencil,
  Scissors,
  Trash2,
  Undo2,
  ChevronRight,
  Palette,
  Crop,
  ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { users } from "@/lib/yw-data";
import { DraggableLayer } from "@/components/yw/moment/DraggableLayer";
import { DrawCanvas } from "@/components/yw/moment/DrawCanvas";
import {
  ZoomPanSurface,
  clampPan,
  MIN_ZOOM,
  MAX_ZOOM,
  type CropTransform,
} from "@/components/yw/moment/ZoomPanSurface";
import {
  MOMENT_EMOJI,
  MOMENT_GIFS,
  MOMENT_LOCATIONS,
  MOMENT_MUSIC,
  TEXT_BACKGROUNDS,
  aiFilterCss,
  useMoments,
  type AiTool,
  type MomentEffect,
  type MomentKind,
  type MomentPrivacy,
  type Sticker,
} from "@/lib/moment-store";

export const Route = createFileRoute("/moment/create")({
  head: () => ({
    meta: [
      { title: "Your Moment Studio — YourWorld" },
      {
        name: "description",
        content:
          "A full-screen moment studio: live camera, one-tap AI filters, music, stickers, drawing, video trim and drag-resize-rotate layers.",
      },
      { property: "og:title", content: "Your Moment Studio — YourWorld" },
      {
        property: "og:description",
        content: "Full-screen camera, AI filters, drawing, trim and premium moment editing on YourWorld.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MomentStudio,
});

const MODES: { id: MomentKind; label: string }[] = [
  { id: "photo", label: "Photo" },
  { id: "video", label: "Video" },
  { id: "text", label: "Text" },
];

const AI_TOOLS: { id: AiTool; label: string; icon: typeof Sparkles }[] = [
  { id: "beauty", label: "Beauty", icon: Sparkles },
  { id: "filter", label: "Face", icon: Smile },
  { id: "background", label: "Backdrop", icon: Wand2 },
  { id: "cartoon", label: "Cartoon", icon: Clapperboard },
  { id: "eraser", label: "Eraser", icon: Eraser },
];

const EFFECTS: { id: MomentEffect; label: string; icon: typeof Repeat }[] = [
  { id: "boomerang", label: "Boomerang", icon: Repeat },
  { id: "slowmo", label: "Slow Mo", icon: Timer },
  { id: "reverse", label: "Reverse", icon: Rewind },
  { id: "greenscreen", label: "Green", icon: Clapperboard },
];

const PRIVACY: { id: MomentPrivacy; label: string; hint: string }[] = [
  { id: "everyone", label: "Everyone", hint: "Anyone on YourWorld" },
  { id: "followers", label: "Followers", hint: "People who follow you" },
  { id: "close", label: "Close Friends", hint: "Your green-list only" },
  { id: "onlyme", label: "Only Me", hint: "Private to you" },
];

const INK = ["#ffffff", "#ff4d8d", "#7cf2d8", "#ffd166", "#8b7cff", "#0a0a0a"];

const CROP_RATIOS = [
  { id: "original", label: "Original", value: 0 },
  { id: "9:16", label: "9:16", value: 9 / 16 },
  { id: "4:5", label: "4:5", value: 4 / 5 },
  { id: "1:1", label: "1:1", value: 1 },
] as const;
type CropRatio = (typeof CROP_RATIOS)[number]["id"];

type Stage = "capture" | "edit";
type Panel =
  | null
  | "music"
  | "stickers"
  | "location"
  | "mentions"
  | "effects"
  | "draw"
  | "trim"
  | "crop"
  | "post";

function MomentStudio() {
  const navigate = useNavigate();
  const { addMoment } = useMoments();

  const [stage, setStage] = useState<Stage>("capture");
  const [kind, setKind] = useState<MomentKind>("photo");
  const [media, setMedia] = useState<{ url: string; type: string } | null>(null);
  const [text, setText] = useState("");
  const [textBg, setTextBg] = useState(TEXT_BACKGROUNDS[0]!);
  const [music, setMusic] = useState<string | undefined>();
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<string | undefined>();
  const [inkColor, setInkColor] = useState(INK[0]!);
  const [inkSize, setInkSize] = useState(5);
  const [inkErase, setInkErase] = useState(false);
  const clearDraw = useRef<() => void>(() => {});
  const [trim, setTrim] = useState<{ start: number; end: number } | null>(null);
  const [videoDur, setVideoDur] = useState(0);
  const [crop, setCrop] = useState<CropTransform>({ zoom: 1, x: 0, y: 0 });
  const [cropRatio, setCropRatio] = useState<CropRatio>("original");
  const [location, setLocation] = useState<string | undefined>();
  const [mentions, setMentions] = useState<string[]>([]);
  const [ai, setAi] = useState<Partial<Record<AiTool, boolean>>>({});
  const [effect, setEffect] = useState<MomentEffect>("none");
  const [privacy, setPrivacy] = useState<MomentPrivacy>("everyone");
  const [duration, setDuration] = useState<12 | 24>(24);
  const [allowDownload, setAllowDownload] = useState(true);
  const [screenshotAlert, setScreenshotAlert] = useState(true);
  const [saveToArchive, setSaveToArchive] = useState(true);
  const [pollOn, setPollOn] = useState(false);
  const [pollQ, setPollQ] = useState("");
  const [pollA, setPollA] = useState("Yes");
  const [pollB, setPollB] = useState("No");
  const [panel, setPanel] = useState<Panel>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const filter = useMemo(() => aiFilterCss(ai, effect), [ai, effect]);

  /* ---------------- live camera ---------------- */
  const camRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [camReady, setCamReady] = useState(false);
  const [camDenied, setCamDenied] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);

  const stopCam = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamReady(false);
  }, []);

  useEffect(() => {
    if (stage !== "capture" || kind === "text") {
      stopCam();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 } },
          audio: kind === "video",
        });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        if (camRef.current) {
          camRef.current.srcObject = s;
          await camRef.current.play().catch(() => {});
        }
        setCamReady(true);
        setCamDenied(false);
      } catch {
        if (!cancelled) setCamDenied(true);
      }
    })();
    return () => {
      cancelled = true;
      stopCam();
    };
  }, [stage, kind, facing, stopCam]);

  useEffect(() => () => stopCam(), [stopCam]);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setRecSecs((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  const useCaptured = (url: string, type: string) => {
    setMedia({ url, type });
    setStage("edit");
  };

  const snapPhoto = () => {
    const v = camRef.current;
    if (!v || !camReady) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth || 1080;
    c.height = v.videoHeight || 1920;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    if (facing === "user") {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((b) => b && useCaptured(URL.createObjectURL(b), "image/png"), "image/png", 0.95);
  };

  const startRec = () => {
    const s = streamRef.current;
    if (!s) return;
    const rec = new MediaRecorder(s);
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: rec.mimeType || "video/webm" });
      useCaptured(URL.createObjectURL(blob), blob.type);
    };
    rec.start();
    recRef.current = rec;
    setRecSecs(0);
    setRecording(true);
  };

  const stopRec = () => {
    recRef.current?.state === "recording" && recRef.current.stop();
    recRef.current = null;
    setRecording(false);
  };

  /* ---------------- mode swipe ---------------- */
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onSwipeStart = (e: React.PointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onSwipeEnd = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) < 60 || Math.abs(e.clientY - s.y) > 70) return;
    const i = MODES.findIndex((m) => m.id === kind);
    const next = MODES[Math.min(MODES.length - 1, Math.max(0, i + (dx < 0 ? 1 : -1)))];
    if (next) setKind(next.id);
  };

  /* ---------------- gallery ---------------- */
  const pick = () => fileRef.current?.click();
  const onFile = (file?: File) => {
    if (!file) return;
    setKind(file.type.startsWith("video") ? "video" : "photo");
    useCaptured(URL.createObjectURL(file), file.type);
  };

  /* ---------------- layers ---------------- */
  const addSticker = (content: string, type: Sticker["type"], color?: string) => {
    const s: Sticker = {
      id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content,
      type,
      x: 0.5,
      y: 0.42,
      scale: 1,
      rotation: 0,
      ...(color ? { color } : {}),
    };
    setStickers((p) => [...p, s]);
    setSelected(s.id);
    setPanel(null);
  };

  const patchSticker = (id: string, patch: Partial<Sticker>) =>
    setStickers((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const removeSelected = () => {
    if (!selected) return;
    setStickers((p) => p.filter((s) => s.id !== selected));
    setSelected(null);
  };

  /* ---------------- trim ---------------- */
  const previewVideo = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = previewVideo.current;
    if (!v || !trim) return;
    const onTime = () => {
      if (v.currentTime > trim.end || v.currentTime < trim.start) v.currentTime = trim.start;
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [trim]);

  /* ---------------- share ---------------- */
  const share = () => {
    if (kind === "text" ? !text.trim() : !media) {
      toast("Add something to your moment first");
      return;
    }
    const created = addMoment({
      kind,
      media: media?.url ?? "",
      mediaType: media?.type,
      text,
      textBg,
      music,
      stickers,
      drawing,
      trim: trim ?? undefined,
      location,
      mentions,
      privacy,
      duration,
      effect,
      ai,
      allowDownload,
      screenshotAlert,
      poll:
        pollOn && pollQ.trim()
          ? { question: pollQ, options: [pollA, pollB], votes: [0, 0], myVote: null }
          : null,
    });
    if (!saveToArchive) toast("Shared — archive off, it disappears when it expires");
    else toast.success(`Moment shared for ${duration} hours`);
    navigate({ to: "/moment/$momentId", params: { momentId: created.id } });
  };

  const isVideo = !!media?.type.startsWith("video");
  const drawMode = panel === "draw";

  /* ---------------- crop / zoom frame ---------------- */
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStageSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setStageSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [stage]);

  const cropBox = useMemo(() => {
    const r = CROP_RATIOS.find((c) => c.id === cropRatio)?.value ?? 0;
    const { w, h } = stageSize;
    if (!r || !w || !h) return { width: "100%", height: "100%" };
    const width = Math.min(w, h * r);
    return { width: `${Math.round(width)}px`, height: `${Math.round(width / r)}px` };
  }, [cropRatio, stageSize]);

  const resetCrop = () => setCrop({ zoom: 1, x: 0, y: 0 });
  useEffect(() => {
    resetCrop();
  }, [media?.url]);

  /* =============================================================== */
  return (
    <main className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-black text-white">
      <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />

      {/* ---------- stage / viewport ---------- */}
      <div
        className="relative flex-1 overflow-hidden"
        ref={stageRef}
        onPointerDown={stage === "capture" ? onSwipeStart : undefined}
        onPointerUp={stage === "capture" ? onSwipeEnd : undefined}
      >
        {/* text canvas */}
        {kind === "text" && !media ? (
          <div className="absolute inset-0 grid place-items-center p-8" style={{ background: textBg }}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your moment…"
              rows={5}
              className="w-full resize-none border-0 bg-transparent text-center font-display text-[26px] font-bold leading-snug text-white outline-none placeholder:text-white/55"
            />
          </div>
        ) : stage === "capture" ? (
          <>
            <video
              ref={camRef}
              muted
              playsInline
              autoPlay
              style={{ filter }}
              className={cn(
                "h-full w-full object-cover transition-[filter] duration-300",
                facing === "user" && "-scale-x-100",
              )}
            />
            {!camReady && (
              <div className="absolute inset-0 grid place-items-center gap-3 bg-black px-10 text-center">
                <div>
                  <div className="mx-auto mb-4 h-12 w-12 animate-float rounded-2xl brand-gradient" />
                  <p className="text-sm font-semibold">
                    {camDenied ? "Camera unavailable" : "Waking up the lens…"}
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    {camDenied
                      ? "Allow camera access, or pick something from your gallery."
                      : "One second — setting the frame."}
                  </p>
                  {camDenied && (
                    <Button onClick={pick} variant="secondary" className="mt-4 rounded-full">
                      <ImageIcon className="mr-1.5 h-4 w-4" /> Open gallery
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="relative grid h-full w-full place-items-center">
            <ZoomPanSurface
              value={crop}
              onChange={setCrop}
              disabled={drawMode}
              className="relative bg-black"
              style={cropBox}
            >
              {isVideo ? (
                <video
                  ref={previewVideo}
                  src={media!.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{ filter }}
                  onLoadedMetadata={(e) => {
                    const d = e.currentTarget.duration;
                    if (Number.isFinite(d)) {
                      setVideoDur(d);
                      setTrim((t) => t ?? { start: 0, end: d });
                    }
                    e.currentTarget.playbackRate = effect === "slowmo" ? 0.5 : 1;
                  }}
                  className="h-full w-full object-cover"
                />
              ) : (
                <img
                  src={media!.url}
                  alt="Moment preview"
                  style={{ filter }}
                  className={cn("h-full w-full object-cover", effect === "boomerang" && "animate-pulse")}
                />
              )}
            </ZoomPanSurface>

            {panel === "crop" && (
              <div
                aria-hidden
                className="pointer-events-none absolute grid grid-cols-3 grid-rows-3 border border-white/70"
                style={{ ...cropBox, boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }}
              >
                {Array.from({ length: 9 }).map((_, i) => (
                  <span key={i} className="border border-white/20" />
                ))}
              </div>
            )}

            {/* drawing */}
            {drawing && !drawMode && (
              <img src={drawing} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
            )}
            {drawMode && (
              <DrawCanvas
                color={inkColor}
                size={inkSize}
                eraser={inkErase}
                initial={drawing}
                onCommit={setDrawing}
                registerClear={(fn) => (clearDraw.current = fn)}
              />
            )}

            {/* layers */}
            {!drawMode &&
              stickers.map((s) => (
                <DraggableLayer
                  key={s.id}
                  selected={selected === s.id}
                  onSelect={() => setSelected(s.id)}
                  transform={{ x: s.x, y: s.y, scale: s.scale, rotation: s.rotation ?? 0 }}
                  onChange={(t) => patchSticker(s.id, { x: t.x, y: t.y, scale: t.scale, rotation: t.rotation })}
                >
                  <span
                    onDoubleClick={() => {
                      if (s.type !== "text") return;
                      const next = window.prompt("Edit text", s.content);
                      if (next !== null) patchSticker(s.id, { content: next || s.content });
                    }}
                    className={cn(
                      "block whitespace-pre px-1 drop-shadow-[0_4px_14px_rgba(0,0,0,0.55)]",
                      s.type === "text" ? "font-display text-[22px] font-bold" : "text-4xl",
                    )}
                    style={s.type === "text" ? { color: s.color ?? "#fff" } : undefined}
                  >
                    {s.content}
                  </span>
                </DraggableLayer>
              ))}

            {/* meta chips */}
            <div className="pointer-events-none absolute inset-x-3 top-16 flex flex-wrap gap-1.5">
              {music && <Chip icon={<Music2 className="h-3 w-3" />}>{music}</Chip>}
              {location && <Chip icon={<MapPin className="h-3 w-3" />}>{location}</Chip>}
              {mentions.length > 0 && <Chip icon={<AtSign className="h-3 w-3" />}>{mentions.length} mentioned</Chip>}
              {effect !== "none" && <Chip icon={<Sparkles className="h-3 w-3" />}>{effect}</Chip>}
            </div>
          </div>
        )}

        {/* top bar */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-3">
          <GlassBtn
            label="Back"
            onClick={() => {
              if (stage === "edit") {
                setStage("capture");
                setMedia(null);
                return;
              }
              navigate({ to: "/" });
            }}
          >
            <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </GlassBtn>

          <div className="flex items-center gap-2">
            {stage === "capture" && kind !== "text" && (
              <GlassBtn label="Flip camera" onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}>
                <SwitchCamera className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </GlassBtn>
            )}
            {(stage === "edit" || kind === "text") && (
              <button
                onClick={() => setPanel("post")}
                className="flex h-9 items-center gap-1 rounded-full brand-gradient px-4 text-[13px] font-semibold text-primary-foreground active:scale-95"
              >
                Preview <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* selected layer controls */}
        {stage === "edit" && selected && !drawMode && (
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/12 p-1 backdrop-blur-xl">
            <MiniBtn onClick={() => patchSticker(selected, { rotation: 0, scale: 1 })} label="Reset layer">
              <Undo2 className="h-4 w-4" />
            </MiniBtn>
            <MiniBtn onClick={removeSelected} label="Delete layer">
              <Trash2 className="h-4 w-4" />
            </MiniBtn>
            <MiniBtn onClick={() => setSelected(null)} label="Done">
              <Check className="h-4 w-4" />
            </MiniBtn>
          </div>
        )}
      </div>

      {/* ---------- controls ---------- */}
      {stage === "capture" ? (
        <div className="shrink-0 bg-gradient-to-t from-black via-black/90 to-transparent pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
          {kind !== "text" && (
            <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto px-4">
              {AI_TOOLS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setAi((p) => ({ ...p, [id]: !p[id] }))}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-all active:scale-95",
                    ai[id] ? "border-white/70 bg-white/20" : "border-white/15 bg-white/8 text-white/70",
                  )}
                >
                  <Icon className="h-[14px] w-[14px]" strokeWidth={1.8} /> {label}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-[64px_1fr_64px] items-center px-6">
            <button onClick={pick} aria-label="Gallery" className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 backdrop-blur-xl active:scale-90">
              <ImageIcon className="h-5 w-5" strokeWidth={1.7} />
            </button>

            {kind === "text" ? (
              <button
                onClick={() => setStage("edit")}
                disabled={!text.trim()}
                className="mx-auto h-[64px] rounded-full brand-gradient px-7 text-sm font-semibold text-primary-foreground disabled:opacity-40 active:scale-95"
              >
                Style it
              </button>
            ) : (
              <button
                onClick={kind === "photo" ? snapPhoto : recording ? stopRec : startRec}
                aria-label={kind === "photo" ? "Take photo" : recording ? "Stop recording" : "Record video"}
                className="group mx-auto grid h-[72px] w-[72px] place-items-center rounded-full active:scale-95"
              >
                <span
                  className={cn(
                    "grid h-[72px] w-[72px] place-items-center rounded-full border-[3px] transition-all duration-300",
                    recording ? "border-[#ff4d6d]" : "border-white/85",
                  )}
                >
                  <span
                    className={cn(
                      "transition-all duration-300",
                      recording
                        ? "h-6 w-6 rounded-[8px] bg-[#ff4d6d]"
                        : kind === "video"
                          ? "h-[54px] w-[54px] rounded-full bg-[#ff4d6d]"
                          : "h-[56px] w-[56px] rounded-full bg-white",
                    )}
                  />
                </span>
              </button>
            )}

            <div className="justify-self-end text-right text-[11px] font-semibold tabular-nums text-white/70">
              {recording ? `${String(Math.floor(recSecs / 60)).padStart(2, "0")}:${String(recSecs % 60).padStart(2, "0")}` : ""}
            </div>
          </div>

          {/* mode rail */}
          <div className="mt-3 flex items-center justify-center gap-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setKind(m.id)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-all duration-300",
                  kind === m.id ? "bg-white/15 text-white" : "text-white/45",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="pt-1 text-center text-[10.5px] text-white/35">Swipe to switch mode</p>
        </div>
      ) : (
        <div className="shrink-0 bg-gradient-to-t from-black via-black/92 to-transparent pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
          {drawMode ? (
            <div className="space-y-3 px-4">
              <div className="flex items-center gap-2">
                {INK.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setInkColor(c);
                      setInkErase(false);
                    }}
                    aria-label={`Ink ${c}`}
                    style={{ background: c }}
                    className={cn(
                      "h-7 w-7 rounded-full border border-white/30 transition-transform",
                      inkColor === c && !inkErase && "scale-110 ring-2 ring-white",
                    )}
                  />
                ))}
                <button
                  onClick={() => setInkErase((v) => !v)}
                  className={cn(
                    "ml-auto grid h-8 w-8 place-items-center rounded-full",
                    inkErase ? "bg-white text-black" : "bg-white/12",
                  )}
                  aria-label="Eraser"
                >
                  <Eraser className="h-4 w-4" />
                </button>
                <button onClick={() => clearDraw.current()} className="grid h-8 w-8 place-items-center rounded-full bg-white/12" aria-label="Clear drawing">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <Palette className="h-4 w-4 text-white/60" />
                <input
                  type="range"
                  min={2}
                  max={22}
                  value={inkSize}
                  onChange={(e) => setInkSize(Number(e.target.value))}
                  aria-label="Brush size"
                  className="h-1 flex-1 accent-white"
                />
                <button onClick={() => setPanel(null)} className="rounded-full bg-white px-4 py-1.5 text-[12.5px] font-semibold text-black active:scale-95">
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
              <Tool icon={<Type />} label="Text" onClick={() => addSticker("Tap to edit", "text", inkColor)} />
              <Tool icon={<Smile />} label="Stickers" active={stickers.some((s) => s.type !== "text")} onClick={() => setPanel("stickers")} />
              <Tool icon={<Pencil />} label="Draw" active={!!drawing} onClick={() => setPanel("draw")} />
              <Tool
                icon={<Crop />}
                label="Crop"
                active={cropRatio !== "original" || crop.zoom > 1.001}
                onClick={() => setPanel("crop")}
              />
              <Tool icon={<Music2 />} label="Music" active={!!music} onClick={() => setPanel("music")} />
              <Tool icon={<Sparkles />} label="Effects" active={effect !== "none"} onClick={() => setPanel("effects")} />
              {isVideo && <Tool icon={<Scissors />} label="Trim" active={!!trim} onClick={() => setPanel("trim")} />}
              <Tool icon={<MapPin />} label="Place" active={!!location} onClick={() => setPanel("location")} />
              <Tool icon={<AtSign />} label="Tag" active={mentions.length > 0} onClick={() => setPanel("mentions")} />
            </div>
          )}
        </div>
      )}

      {/* ---------- panels ---------- */}
      <Sheet open={panel !== null && panel !== "draw"} onOpenChange={(v) => !v && setPanel(null)}>
        <SheetContent
          side="bottom"
          className="max-h-[82vh] overflow-y-auto rounded-t-[28px] border-white/10 bg-[oklch(0.16_0.014_277)] text-white"
        >
          <SheetHeader>
            <SheetTitle className="capitalize text-white">
              {panel === "post" ? "Preview & share" : (panel ?? "")}
            </SheetTitle>
          </SheetHeader>

          {panel === "music" && (
            <ul className="space-y-1.5 pt-3">
              {MOMENT_MUSIC.map((m) => (
                <li key={m}>
                  <PanelRow active={music === m} onClick={() => { setMusic(music === m ? undefined : m); setPanel(null); }}>
                    <Music2 className="h-4 w-4 text-white/50" />
                    <span className="min-w-0 flex-1 truncate text-sm">{m}</span>
                  </PanelRow>
                </li>
              ))}
            </ul>
          )}

          {panel === "stickers" && (
            <div className="space-y-4 pt-3">
              <div>
                <SectionTitle>Emoji</SectionTitle>
                <div className="grid grid-cols-8 gap-2">
                  {MOMENT_EMOJI.map((e) => (
                    <button key={e} onClick={() => addSticker(e, "emoji")} className="grid h-10 place-items-center rounded-xl bg-white/8 text-xl active:scale-90">
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <SectionTitle>GIFs</SectionTitle>
                <div className="grid grid-cols-3 gap-2">
                  {MOMENT_GIFS.map((g) => (
                    <button key={g.id} onClick={() => addSticker(g.content, "gif")} className="flex h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-white/8 active:scale-95">
                      <span className="animate-pulse text-xl">{g.content}</span>
                      <span className="text-[10px] text-white/55">{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {panel === "effects" && (
            <div className="grid grid-cols-4 gap-2 pt-3">
              {EFFECTS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setEffect((p) => (p === id ? "none" : id))}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 transition-all active:scale-95",
                    effect === id ? "border-primary/60 bg-primary/15" : "border-white/12 bg-white/6 text-white/70",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                  <span className="text-[10.5px] font-semibold leading-tight">{label}</span>
                </button>
              ))}
            </div>
          )}

          {panel === "crop" && (
            <div className="space-y-4 pt-4">
              <div>
                <SectionTitle>Frame</SectionTitle>
                <div className="grid grid-cols-4 gap-2">
                  {CROP_RATIOS.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setCropRatio(r.id)}
                      className={cn(
                        "rounded-2xl border py-3 text-[11.5px] font-semibold transition-all active:scale-95",
                        cropRatio === r.id
                          ? "border-primary/60 bg-primary/15"
                          : "border-white/12 bg-white/6 text-white/70",
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <SectionTitle>Zoom</SectionTitle>
                <div className="flex items-center gap-3">
                  <ZoomIn className="h-4 w-4 text-white/60" />
                  <input
                    type="range"
                    min={MIN_ZOOM}
                    max={MAX_ZOOM}
                    step={0.01}
                    value={crop.zoom}
                    aria-label="Zoom"
                    onChange={(e) => setZoomFromSlider(Number(e.target.value))}
                    className="h-1 flex-1 accent-white"
                  />
                  <span className="w-10 text-right text-[11px] tabular-nums text-white/60">
                    {crop.zoom.toFixed(1)}x
                  </span>
                </div>
                <p className="pt-2 text-[11px] text-white/45">
                  Pinch, scroll or drag on the preview to reframe.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    resetCrop();
                    setCropRatio("original");
                  }}
                  className="h-11 flex-1 rounded-full"
                >
                  Reset
                </Button>
                <Button
                  onClick={() => setPanel(null)}
                  className="h-11 flex-1 rounded-full brand-gradient text-primary-foreground"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
          {panel === "trim" && trim && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span>{trim.start.toFixed(1)}s</span>
                <span className="font-semibold text-white">{(trim.end - trim.start).toFixed(1)}s clip</span>
                <span>{trim.end.toFixed(1)}s</span>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-[11px] text-white/60">Start</Label>
                  <input
                    type="range" min={0} max={Math.max(0.1, videoDur)} step={0.1} value={trim.start}
                    onChange={(e) => setTrim((t) => t && { ...t, start: Math.min(Number(e.target.value), t.end - 0.5) })}
                    className="h-1 w-full accent-white"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-white/60">End</Label>
                  <input
                    type="range" min={0} max={Math.max(0.1, videoDur)} step={0.1} value={trim.end}
                    onChange={(e) => setTrim((t) => t && { ...t, end: Math.max(Number(e.target.value), t.start + 0.5) })}
                    className="h-1 w-full accent-white"
                  />
                </div>
              </div>
              <Button onClick={() => setPanel(null)} className="h-11 w-full rounded-full brand-gradient text-primary-foreground">
                Apply trim
              </Button>
            </div>
          )}

          {panel === "location" && (
            <ul className="space-y-1.5 pt-3">
              {MOMENT_LOCATIONS.map((l) => (
                <li key={l}>
                  <PanelRow active={location === l} onClick={() => { setLocation(location === l ? undefined : l); setPanel(null); }}>
                    <MapPin className="h-4 w-4 text-white/50" />
                    <span className="min-w-0 flex-1 truncate text-sm">{l}</span>
                  </PanelRow>
                </li>
              ))}
            </ul>
          )}

          {panel === "mentions" && (
            <ul className="space-y-1.5 pt-3">
              {users.map((u) => {
                const on = mentions.includes(u.id);
                return (
                  <li key={u.id}>
                    <PanelRow active={on} onClick={() => setMentions((p) => (on ? p.filter((x) => x !== u.id) : [...p, u.id]))}>
                      <AtSign className="h-4 w-4 text-white/50" />
                      <span className="min-w-0 flex-1 truncate text-sm">{u.username}</span>
                    </PanelRow>
                  </li>
                );
              })}
            </ul>
          )}

          {panel === "post" && (
            <div className="space-y-5 pt-4">
              {kind === "text" && (
                <div>
                  <SectionTitle>Background</SectionTitle>
                  <div className="flex gap-2">
                    {TEXT_BACKGROUNDS.map((bg) => (
                      <button
                        key={bg}
                        onClick={() => setTextBg(bg)}
                        style={{ background: bg }}
                        aria-label="Background option"
                        className={cn("h-10 w-10 rounded-full transition", textBg === bg && "ring-2 ring-white")}
                      />
                    ))}
                  </div>
                </div>
              )}

              {kind !== "text" && (
                <div>
                  <SectionTitle>Caption</SectionTitle>
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Say something about this moment…"
                    className="min-h-16 resize-none border-white/10 bg-white/6 text-white placeholder:text-white/40"
                  />
                </div>
              )}

              <div>
                <SectionTitle>Privacy</SectionTitle>
                <div className="grid grid-cols-2 gap-2">
                  {PRIVACY.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPrivacy(p.id)}
                      className={cn(
                        "rounded-2xl border px-3 py-2.5 text-left transition-all active:scale-[0.98]",
                        privacy === p.id ? "border-primary/60 bg-primary/15" : "border-white/12 bg-white/6",
                      )}
                    >
                      <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                        <Lock className="h-3.5 w-3.5 text-white/50" />
                        {p.label}
                        {privacy === p.id && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-white/50">{p.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <SectionTitle>Duration</SectionTitle>
                <div className="grid grid-cols-2 gap-2">
                  {([12, 24] as const).map((h) => (
                    <button
                      key={h}
                      onClick={() => setDuration(h)}
                      className={cn(
                        "rounded-2xl border py-3 text-[13px] font-semibold transition-all active:scale-[0.98]",
                        duration === h ? "border-primary/60 bg-primary/15" : "border-white/12 bg-white/6",
                      )}
                    >
                      {h} Hours
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <SectionTitle>Interaction & Safety</SectionTitle>
                <Row icon={<BarChart3 className="h-4 w-4" />} title="Add a poll" hint="Let viewers vote on your moment" checked={pollOn} onChange={setPollOn} />
                {pollOn && (
                  <div className="space-y-2 rounded-2xl bg-white/6 p-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="pollq" className="text-xs text-white/70">Question</Label>
                      <Input id="pollq" value={pollQ} onChange={(e) => setPollQ(e.target.value)} placeholder="Which shot should I post?" className="h-10 border-white/10 bg-black/40 text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={pollA} onChange={(e) => setPollA(e.target.value)} className="h-10 border-white/10 bg-black/40 text-white" />
                      <Input value={pollB} onChange={(e) => setPollB(e.target.value)} className="h-10 border-white/10 bg-black/40 text-white" />
                    </div>
                  </div>
                )}
                <Row icon={<Bell className="h-4 w-4" />} title="Screenshot alert" hint="Tell me when someone captures this moment" checked={screenshotAlert} onChange={setScreenshotAlert} />
                <Row icon={<Download className="h-4 w-4" />} title="Allow downloads" hint="Viewers can save it with the YW watermark" checked={allowDownload} onChange={setAllowDownload} />
                <Row icon={<Sparkles className="h-4 w-4" />} title="Save to archive" hint="Keep a private copy after it expires" checked={saveToArchive} onChange={setSaveToArchive} />
              </div>

              <Button onClick={share} className="h-12 w-full rounded-full brand-gradient text-primary-foreground">
                Share moment
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}

/* ---------------- bits ---------------- */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50">{children}</h2>;
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex max-w-[60%] items-center gap-1 truncate rounded-full bg-black/45 px-2 py-1 text-[10.5px] font-semibold capitalize text-white backdrop-blur-md">
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

function GlassBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full bg-white/12 text-white backdrop-blur-xl transition-transform active:scale-90"
    >
      {children}
    </button>
  );
}

function MiniBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} className="grid h-9 w-9 place-items-center rounded-full text-white active:scale-90">
      {children}
    </button>
  );
}

function Tool({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 flex-col items-center gap-1 rounded-2xl border px-3 py-2 transition-all active:scale-95 [&_svg]:h-[18px] [&_svg]:w-[18px]",
        active ? "border-white/70 bg-white/18 text-white" : "border-white/12 bg-white/7 text-white/75",
      )}
    >
      {icon}
      <span className="text-[10.5px] font-semibold">{label}</span>
    </button>
  );
}

function PanelRow({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition active:scale-[0.99]",
        active ? "bg-primary/20" : "bg-white/6",
      )}
    >
      {children}
      {active && <Check className="h-4 w-4 text-primary" />}
    </button>
  );
}

function Row({
  icon,
  title,
  hint,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/6 px-3.5 py-3">
      <div className="flex min-w-0 items-start gap-3 pr-3">
        <span className="mt-0.5 text-white/55">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-white/50">{hint}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
