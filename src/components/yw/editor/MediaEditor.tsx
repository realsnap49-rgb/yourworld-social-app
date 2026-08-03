import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Crop,
  Gauge,
  Scissors,
  Music4,
  Type as TypeIcon,
  Sparkles,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Split,
  Trash2,
  Mic,
  AudioLines,
  Plus,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  FILTERS,
  FONTS,
  MUSIC,
  SFX,
  SPEED_CURVES,
  STICKERS,
  TRANSITIONS,
  initialEditorState,
  type EditorState,
  type Ratio,
} from "./editor-types";

type Media = { url: string; type: string; name: string };

const TOOLS = [
  { id: "crop", label: "Crop", icon: Crop },
  { id: "speed", label: "Speed", icon: Gauge },
  { id: "trim", label: "Trim", icon: Scissors },
  { id: "audio", label: "Audio", icon: Music4 },
  { id: "text", label: "Text", icon: TypeIcon },
  { id: "fx", label: "FX", icon: Sparkles },
] as const;
type Tool = (typeof TOOLS)[number]["id"];

const RATIOS: { id: Ratio; label: string; value: number }[] = [
  { id: "9:16", label: "9:16", value: 9 / 16 },
  { id: "1:1", label: "1:1", value: 1 },
  { id: "4:5", label: "4:5", value: 4 / 5 },
  { id: "free", label: "Free", value: 0 },
];

export function MediaEditor({
  media,
  kind,
  onBack,
  onNext,
}: {
  media: Media;
  kind: "post" | "reel";
  onBack: () => void;
  onNext: (state: EditorState) => void;
}) {
  const isVideo = media.type.startsWith("video");
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(15);
  const [playhead, setPlayhead] = useState(0);
  const [tool, setTool] = useState<Tool>("crop");
  const [recording, setRecording] = useState(false);

  const [past, setPast] = useState<EditorState[]>([]);
  const [state, setStateRaw] = useState<EditorState>(() => initialEditorState(15));
  const [future, setFuture] = useState<EditorState[]>([]);

  const set = useCallback(
    (patch: Partial<EditorState> | ((s: EditorState) => Partial<EditorState>)) => {
      setStateRaw((s) => {
        const next = { ...s, ...(typeof patch === "function" ? patch(s) : patch) };
        setPast((p) => [...p.slice(-29), s]);
        setFuture([]);
        return next;
      });
    },
    [],
  );

  const undo = () => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1]!;
      setStateRaw((cur) => {
        setFuture((f) => [cur, ...f].slice(0, 30));
        return prev;
      });
      return p.slice(0, -1);
    });
  };

  const redo = () => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0]!;
      setStateRaw((cur) => {
        setPast((p) => [...p, cur]);
        return next;
      });
      return f.slice(1);
    });
  };

  /* media metadata + playback */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      const d = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 15;
      setDuration(d);
      setStateRaw((s) => ({ ...s, clips: [{ id: "c1", start: 0, end: d }] }));
    };
    const onTime = () => setPlayhead(v.currentTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("timeupdate", onTime);
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("timeupdate", onTime);
    };
  }, [isVideo]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = Math.min(5, Math.max(0.1, state.speed));
  }, [state.speed]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.volume = Math.min(1, state.volume / 100);
  }, [state.volume]);

  /* pinch-to-zoom on the stage */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number; x: number; y: number; cx: number; cy: number } | null>(null);

  const stageDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      const [a, b] = pts as [{ x: number; y: number }, { x: number; y: number }];
      pinch.current = {
        dist: Math.hypot(b.x - a.x, b.y - a.y),
        zoom: state.zoom,
        x: state.offsetX,
        y: state.offsetY,
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
      };
    }
  };

  const stageMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 2 && pinch.current) {
      const [a, b] = pts as [{ x: number; y: number }, { x: number; y: number }];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const p = pinch.current;
      setStateRaw((s) => ({
        ...s,
        zoom: Math.min(4, Math.max(1, (p.zoom * dist) / p.dist)),
        offsetX: p.x + (cx - p.cx),
        offsetY: p.y + (cy - p.cy),
      }));
    }
  };

  const stageUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const filterCss = useMemo(() => {
    const preset = FILTERS.find((f) => f.id === state.filter)?.css ?? "";
    const grade = `brightness(${state.brightness}%) contrast(${state.contrast}%) saturate(${state.saturation}%) sepia(${Math.max(0, state.warmth) / 200}) hue-rotate(${state.warmth < 0 ? state.warmth / 8 : 0}deg)`;
    return `${preset} ${grade}`.trim();
  }, [state.filter, state.brightness, state.contrast, state.saturation, state.warmth]);

  const ratio = RATIOS.find((r) => r.id === state.ratio)?.value ?? 0;

  const addText = () =>
    set((s) => ({
      texts: [
        ...s.texts,
        {
          id: `t-${Date.now()}`,
          text: "Tap to edit",
          x: 0.5,
          y: 0.5,
          color: "#ffffff",
          font: "Display",
          anim: "fade" as const,
          style: "plain" as const,
          size: 28,
        },
      ],
    }));

  const activeText = state.texts[state.texts.length - 1];

  const dragLayer = (
    id: string,
    kindLayer: "text" | "sticker",
  ) => (e: React.PointerEvent) => {
    e.stopPropagation();
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => {
      const x = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height));
      setStateRaw((s) =>
        kindLayer === "text"
          ? { ...s, texts: s.texts.map((t) => (t.id === id ? { ...t, x, y } : t)) }
          : { ...s, stickers: s.stickers.map((t) => (t.id === id ? { ...t, x, y } : t)) },
      );
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const clipAt = state.clips.find((c) => c.id === state.activeClip) ?? state.clips[0]!;

  const splitClip = () => {
    const at = Math.min(clipAt.end - 0.2, Math.max(clipAt.start + 0.2, playhead));
    set((s) => ({
      clips: s.clips.flatMap((c) =>
        c.id === clipAt.id
          ? [
              { ...c, end: at },
              { id: `c-${Date.now()}`, start: at, end: c.end },
            ]
          : [c],
      ),
    }));
    toast.success("Clip split");
  };

  const deleteClip = () => {
    if (state.clips.length === 1) {
      toast("At least one clip is required");
      return;
    }
    set((s) => {
      const clips = s.clips.filter((c) => c.id !== s.activeClip);
      return { clips, activeClip: clips[0]!.id };
    });
  };

  const scrub = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * duration;
    setPlayhead(t);
    if (videoRef.current) videoRef.current.currentTime = t;
  };

  const toggleVoiceover = async () => {
    if (recording) {
      setRecording(false);
      set({ voiceover: `Voiceover · ${new Date().toLocaleTimeString()}` });
      toast.success("Voiceover added");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setRecording(true);
      toast("Recording voiceover — tap again to stop");
    } catch {
      toast("Microphone unavailable");
    }
  };

  return (
    <main className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* top controls */}
      <header className="flex items-center justify-between gap-2 px-3 pt-3">
        <button
          onClick={onBack}
          aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-full border border-border/50 bg-background/40 backdrop-blur-xl transition-transform active:scale-90"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={!past.length}
            aria-label="Undo"
            className="grid h-10 w-10 place-items-center rounded-full border border-border/50 bg-background/40 backdrop-blur-xl transition-transform active:scale-90 disabled:opacity-35"
          >
            <Undo2 className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={redo}
            disabled={!future.length}
            aria-label="Redo"
            className="grid h-10 w-10 place-items-center rounded-full border border-border/50 bg-background/40 backdrop-blur-xl transition-transform active:scale-90 disabled:opacity-35"
          >
            <Redo2 className="h-[18px] w-[18px]" />
          </button>
          <Button
            size="sm"
            onClick={() => onNext(state)}
            className="h-10 rounded-full brand-gradient px-6 font-ui text-[13px] font-semibold text-primary-foreground glow"
          >
            Next
          </Button>
        </div>
      </header>

      {/* preview stage */}
      <section className="flex min-h-0 flex-1 items-center justify-center px-4 py-3">
        <div
          ref={stageRef}
          onPointerDown={stageDown}
          onPointerMove={stageMove}
          onPointerUp={stageUp}
          onPointerCancel={stageUp}
          style={ratio ? { aspectRatio: String(ratio) } : { aspectRatio: "9 / 16" }}
          className="relative h-full max-h-full touch-none overflow-hidden rounded-[22px] border border-border/50 bg-secondary"
        >
          <div
            className="absolute inset-0"
            style={{
              transform: `translate3d(${state.offsetX}px, ${state.offsetY}px, 0) scale(${state.zoom}) rotate(${state.rotation}deg) scaleX(${state.flipH ? -1 : 1}) scaleY(${state.flipV ? -1 : 1})`,
              filter: filterCss,
              willChange: "transform",
            }}
          >
            {isVideo ? (
              <video
                ref={videoRef}
                src={media.url}
                playsInline
                loop
                autoPlay
                muted={state.volume === 0}
                className="h-full w-full object-cover"
              />
            ) : (
              <img src={media.url} alt="Editing preview" className="h-full w-full object-cover" />
            )}
          </div>

          {state.texts.map((t) => (
            <div
              key={t.id}
              onPointerDown={dragLayer(t.id, "text")}
              style={{
                left: `${t.x * 100}%`,
                top: `${t.y * 100}%`,
                color: t.color,
                fontSize: t.size,
                transform: "translate(-50%, -50%)",
              }}
              className={cn(
                "absolute max-w-[80%] cursor-grab touch-none select-none text-center font-display font-bold leading-tight",
                t.style === "boxed" && "rounded-xl bg-background/60 px-3 py-1 backdrop-blur-md",
                t.style === "outline" && "[text-shadow:0_0_2px_#000,0_2px_8px_rgba(0,0,0,0.6)]",
                t.anim === "fade" && "animate-fade-in",
                t.anim === "pop" && "animate-scale-in",
                t.anim === "slide" && "animate-slide-in-right",
              )}
            >
              {t.text}
            </div>
          ))}

          {state.stickers.map((s) => (
            <div
              key={s.id}
              onPointerDown={dragLayer(s.id, "sticker")}
              style={{
                left: `${s.x * 100}%`,
                top: `${s.y * 100}%`,
                fontSize: s.size,
                transform: "translate(-50%, -50%)",
              }}
              className="absolute cursor-grab touch-none select-none"
            >
              {s.emoji}
            </div>
          ))}

          {state.pip && (
            <div className="absolute right-3 top-3 h-24 w-[70px] overflow-hidden rounded-xl border border-foreground/25 bg-background/60 backdrop-blur-md">
              <img src={media.url} alt="Picture in picture overlay" className="h-full w-full object-cover" />
            </div>
          )}

          {state.autoCaptions && (
            <div className="absolute inset-x-4 bottom-5 rounded-lg bg-background/55 px-3 py-1.5 text-center font-ui text-[12px] font-medium backdrop-blur-md">
              Auto-captions will be generated on publish
            </div>
          )}
        </div>
      </section>

      {/* timeline */}
      <section className="px-4">
        <div className="mb-1.5 flex items-center justify-between font-ui text-[11px] text-muted-foreground">
          <span>{fmt(playhead)}</span>
          <span>
            {state.speed.toFixed(1)}× · {state.clips.length} clip{state.clips.length > 1 ? "s" : ""}
          </span>
          <span>{fmt(duration)}</span>
        </div>
        <div
          onPointerDown={scrub}
          className="relative h-14 touch-none overflow-hidden rounded-xl border border-border/50 bg-secondary/60"
        >
          <div className="absolute inset-0 flex">
            {state.clips.map((c) => (
              <button
                key={c.id}
                onClick={(e) => {
                  e.stopPropagation();
                  set({ activeClip: c.id });
                }}
                style={{ width: `${((c.end - c.start) / duration) * 100}%` }}
                className={cn(
                  "relative h-full border-r border-background/60 bg-cover bg-center transition-opacity",
                  state.activeClip === c.id ? "opacity-100" : "opacity-45",
                )}
              >
                <span className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0,color-mix(in_oklab,var(--primary)_28%,transparent)_50%,transparent_100%)]" />
                {state.activeClip === c.id && (
                  <span className="absolute inset-0 rounded-[10px] outline outline-2 -outline-offset-2 outline-primary" />
                )}
              </button>
            ))}
          </div>
          <div
            style={{ left: `${Math.min(100, (playhead / duration) * 100)}%` }}
            className="pointer-events-none absolute top-0 h-full w-0.5 bg-foreground"
          />
          {/* audio track */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-4 items-center gap-1 bg-background/50 px-2 font-ui text-[9.5px] text-muted-foreground">
            <AudioLines className="h-3 w-3" />
            <span className="truncate">{state.music ?? state.voiceover ?? "Original audio"}</span>
          </div>
        </div>
      </section>

      {/* tool panels */}
      <section className="min-h-[178px] px-4 pt-3">
        {tool === "crop" && (
          <Panel>
            <Row label="Aspect ratio">
              <Chips
                items={RATIOS.map((r) => ({ id: r.id, label: r.label }))}
                value={state.ratio}
                onSelect={(id) => set({ ratio: id as Ratio })}
              />
            </Row>
            <div className="flex flex-wrap gap-2">
              <Action icon={RotateCw} label="Rotate" onClick={() => set((s) => ({ rotation: (s.rotation + 90) % 360 }))} />
              <Action icon={FlipHorizontal} label="Flip H" onClick={() => set((s) => ({ flipH: !s.flipH }))} />
              <Action icon={FlipVertical} label="Flip V" onClick={() => set((s) => ({ flipV: !s.flipV }))} />
              <Action
                icon={Crop}
                label="Reset"
                onClick={() => set({ zoom: 1, offsetX: 0, offsetY: 0, rotation: 0, flipH: false, flipV: false })}
              />
            </div>
            <Row label={`Zoom · ${state.zoom.toFixed(2)}× (pinch on preview)`}>
              <Slider
                value={[state.zoom * 100]}
                min={100}
                max={400}
                step={5}
                onValueChange={([v]) => setStateRaw((s) => ({ ...s, zoom: (v ?? 100) / 100 }))}
              />
            </Row>
          </Panel>
        )}

        {tool === "speed" && (
          <Panel>
            <Row label={`Speed · ${state.speed.toFixed(1)}×`}>
              <Slider
                value={[state.speed * 10]}
                min={1}
                max={50}
                step={1}
                onValueChange={([v]) => setStateRaw((s) => ({ ...s, speed: (v ?? 10) / 10 }))}
              />
            </Row>
            <Chips
              items={[0.1, 0.25, 0.5, 1, 2, 3, 5].map((v) => ({ id: String(v), label: `${v}×` }))}
              value={String(state.speed)}
              onSelect={(id) => set({ speed: Number(id) })}
            />
            <Row label="Speed curve">
              <Chips
                items={SPEED_CURVES.map((c) => ({ id: c.id, label: c.label }))}
                value={state.speedCurve}
                onSelect={(id) => set({ speedCurve: id as EditorState["speedCurve"] })}
              />
            </Row>
          </Panel>
        )}

        {tool === "trim" && (
          <Panel>
            <div className="flex flex-wrap gap-2">
              <Action icon={Split} label="Split" onClick={splitClip} />
              <Action icon={Trash2} label="Delete clip" onClick={deleteClip} />
              <Action
                icon={Plus}
                label="Duplicate"
                onClick={() =>
                  set((s) => ({
                    clips: [...s.clips, { id: `c-${Date.now()}`, start: clipAt.start, end: clipAt.end }],
                  }))
                }
              />
            </div>
            <Row label={`Trim in · ${fmt(clipAt.start)}`}>
              <Slider
                value={[clipAt.start]}
                min={0}
                max={Math.max(0.2, clipAt.end - 0.2)}
                step={0.1}
                onValueChange={([v]) =>
                  setStateRaw((s) => ({
                    ...s,
                    clips: s.clips.map((c) => (c.id === clipAt.id ? { ...c, start: v ?? 0 } : c)),
                  }))
                }
              />
            </Row>
            <Row label={`Trim out · ${fmt(clipAt.end)}`}>
              <Slider
                value={[clipAt.end]}
                min={clipAt.start + 0.2}
                max={duration}
                step={0.1}
                onValueChange={([v]) =>
                  setStateRaw((s) => ({
                    ...s,
                    clips: s.clips.map((c) => (c.id === clipAt.id ? { ...c, end: v ?? duration } : c)),
                  }))
                }
              />
            </Row>
          </Panel>
        )}

        {tool === "audio" && (
          <Panel>
            <Row label="Music library">
              <Chips
                items={MUSIC.map((m) => ({ id: m, label: m }))}
                value={state.music ?? ""}
                onSelect={(id) => set({ music: state.music === id ? undefined : id })}
              />
            </Row>
            <Row label="Trending sound effects">
              <Chips
                items={SFX.map((m) => ({ id: m, label: m }))}
                value={state.sfx ?? ""}
                onSelect={(id) => set({ sfx: state.sfx === id ? undefined : id })}
              />
            </Row>
            <div className="flex flex-wrap gap-2">
              <Action
                icon={Mic}
                label={recording ? "Stop voiceover" : "Voiceover"}
                active={recording}
                onClick={toggleVoiceover}
              />
              <Action
                icon={AudioLines}
                label={state.extractedAudio ? "Audio extracted" : "Extract audio"}
                active={state.extractedAudio}
                onClick={() => {
                  set((s) => ({ extractedAudio: !s.extractedAudio }));
                  toast.success(state.extractedAudio ? "Extraction removed" : "Audio extracted from clip");
                }}
              />
            </div>
            <Row label={`Volume · ${state.volume}%`}>
              <Slider
                value={[state.volume]}
                max={200}
                step={1}
                onValueChange={([v]) => setStateRaw((s) => ({ ...s, volume: v ?? 100 }))}
              />
            </Row>
          </Panel>
        )}

        {tool === "text" && (
          <Panel>
            <div className="flex flex-wrap gap-2">
              <Action icon={TypeIcon} label="Add text" onClick={addText} />
              {activeText && (
                <Action
                  icon={Trash2}
                  label="Remove"
                  onClick={() => set((s) => ({ texts: s.texts.slice(0, -1) }))}
                />
              )}
            </div>
            {activeText && (
              <>
                <Input
                  value={activeText.text}
                  onChange={(e) =>
                    setStateRaw((s) => ({
                      ...s,
                      texts: s.texts.map((t) => (t.id === activeText.id ? { ...t, text: e.target.value } : t)),
                    }))
                  }
                  className="h-10 border-0 bg-secondary"
                  placeholder="Type your caption…"
                />
                <Row label="Font">
                  <Chips
                    items={FONTS.map((f) => ({ id: f, label: f }))}
                    value={activeText.font}
                    onSelect={(id) =>
                      set((s) => ({
                        texts: s.texts.map((t) => (t.id === activeText.id ? { ...t, font: id } : t)),
                      }))
                    }
                  />
                </Row>
                <Row label="Animation & style">
                  <div className="flex flex-wrap gap-2">
                    <Chips
                      items={["none", "fade", "pop", "slide"].map((a) => ({ id: a, label: a }))}
                      value={activeText.anim}
                      onSelect={(id) =>
                        set((s) => ({
                          texts: s.texts.map((t) =>
                            t.id === activeText.id ? { ...t, anim: id as typeof t.anim } : t,
                          ),
                        }))
                      }
                    />
                    <Chips
                      items={["plain", "boxed", "outline"].map((a) => ({ id: a, label: a }))}
                      value={activeText.style}
                      onSelect={(id) =>
                        set((s) => ({
                          texts: s.texts.map((t) =>
                            t.id === activeText.id ? { ...t, style: id as typeof t.style } : t,
                          ),
                        }))
                      }
                    />
                  </div>
                </Row>
              </>
            )}
            <div className="flex items-center justify-between rounded-2xl bg-secondary px-4 py-2.5">
              <div>
                <p className="text-[13px] font-semibold">Auto-captions</p>
                <p className="text-[11px] text-muted-foreground">Transcribe speech into styled captions</p>
              </div>
              <Switch checked={state.autoCaptions} onCheckedChange={(v) => set({ autoCaptions: v })} />
            </div>
          </Panel>
        )}

        {tool === "fx" && (
          <Panel>
            <Row label="Filters">
              <Chips
                items={FILTERS.map((f) => ({ id: f.id, label: f.label }))}
                value={state.filter}
                onSelect={(id) => set({ filter: id })}
              />
            </Row>
            <div className="grid grid-cols-2 gap-3">
              <Row label={`Bright ${state.brightness}`}>
                <Slider
                  value={[state.brightness]}
                  min={50}
                  max={150}
                  onValueChange={([v]) => setStateRaw((s) => ({ ...s, brightness: v ?? 100 }))}
                />
              </Row>
              <Row label={`Contrast ${state.contrast}`}>
                <Slider
                  value={[state.contrast]}
                  min={50}
                  max={150}
                  onValueChange={([v]) => setStateRaw((s) => ({ ...s, contrast: v ?? 100 }))}
                />
              </Row>
              <Row label={`Saturation ${state.saturation}`}>
                <Slider
                  value={[state.saturation]}
                  min={0}
                  max={200}
                  onValueChange={([v]) => setStateRaw((s) => ({ ...s, saturation: v ?? 100 }))}
                />
              </Row>
              <Row label={`Warmth ${state.warmth}`}>
                <Slider
                  value={[state.warmth + 100]}
                  min={0}
                  max={200}
                  onValueChange={([v]) => setStateRaw((s) => ({ ...s, warmth: (v ?? 100) - 100 }))}
                />
              </Row>
            </div>
            <Row label="Transitions">
              <Chips
                items={TRANSITIONS.map((t) => ({ id: t, label: t }))}
                value={state.transition}
                onSelect={(id) => set({ transition: id })}
              />
            </Row>
            <Row label="Stickers">
              <div className="flex flex-wrap gap-2">
                {STICKERS.map((s) => (
                  <button
                    key={s}
                    onClick={() =>
                      set((st) => ({
                        stickers: [
                          ...st.stickers,
                          { id: `s-${Date.now()}`, emoji: s, x: 0.5, y: 0.35, size: 44 },
                        ],
                      }))
                    }
                    className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-lg transition-transform active:scale-90"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Row>
            <Action
              icon={Layers}
              label={state.pip ? "Remove PIP overlay" : "Add PIP overlay"}
              active={!!state.pip}
              onClick={() => set((s) => ({ pip: s.pip ? undefined : media.url }))}
            />
          </Panel>
        )}
      </section>

      {/* tool bar */}
      <nav className="safe-bottom flex items-center justify-between gap-1 border-t border-border/50 px-3 pb-4 pt-2.5">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 font-ui text-[10.5px] font-medium transition-colors",
              tool === t.id ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <t.icon className={cn("h-[18px] w-[18px]", tool === t.id && "text-primary")} />
            {t.label}
          </button>
        ))}
      </nav>
      <p className="sr-only">
        Editing {kind === "reel" ? "a reel" : "a post"} — {media.name}
      </p>
    </main>
  );
}

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in space-y-3">{children}</div>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="font-ui text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Chips({
  items,
  value,
  onSelect,
}: {
  items: { id: string; label: string }[];
  value: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
      {items.map((i) => (
        <button
          key={i.id}
          onClick={() => onSelect(i.id)}
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 font-ui text-[11.5px] font-medium capitalize transition-colors",
            value === i.id ? "bg-foreground/15 text-foreground" : "bg-secondary text-muted-foreground",
          )}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}

function Action({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: typeof Crop;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-full bg-secondary px-3.5 py-2 font-ui text-[11.5px] font-medium transition-transform active:scale-95",
        active && "bg-foreground/15 text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
