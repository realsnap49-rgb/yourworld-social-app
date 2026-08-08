import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  X,
  SwitchCamera,
  Zap,
  ZapOff,
  Images,
  Radio,
  FileText,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useYw } from "@/lib/yw-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MediaEditor } from "@/components/yw/editor/MediaEditor";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Camera — YourWorld" },
      {
        name: "description",
        content:
          "Full-screen YourWorld camera: switch between Post, Moment, Reel and Live, capture instantly and share.",
      },
      { property: "og:title", content: "Camera — YourWorld" },
      {
        property: "og:description",
        content: "Capture posts, moments, reels and go live from one full-screen camera.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CameraPage,
});

const MODES = ["POST", "REEL", "LIVE"] as const;
type Mode = (typeof MODES)[number];

function CameraPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("POST");
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [flash, setFlash] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [camDenied, setCamDenied] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [shot, setShot] = useState<{ url: string; type: string; name: string } | null>(null);
  const [composer, setComposer] = useState(false);
  const [editing, setEditing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* live camera */
  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 } },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCamReady(true);
        setCamDenied(false);
      } catch {
        if (!cancelled) {
          setCamReady(false);
          setCamDenied(true);
        }
      }
    }
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facing]);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setRecSecs((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  const capturePhoto = () => {
    const v = videoRef.current;
    if (!v || !camReady) {
      toast("Camera unavailable — pick from your gallery");
      return null;
    }
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 1080;
    canvas.height = v.videoHeight || 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) {
      toast("Camera unavailable — pick a video from your gallery");
      return;
    }
    const rec = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      setShot({ url: URL.createObjectURL(blob), type: "video/webm", name: "reel.webm" });
      setEditing(true);
    };
    recRef.current = rec;
    rec.start();
    setRecSecs(0);
    setRecording(true);
  };

  const stopRecording = () => {
    recRef.current?.stop();
    recRef.current = null;
    setRecording(false);
  };

  const onShutter = () => {
    if (mode === "LIVE") {
      toast.success("You're live — say hi to your world");
      return;
    }
    if (mode === "REEL") {
      recording ? stopRecording() : startRecording();
      return;
    }
    const url = capturePhoto();
    if (!url) return;
    setShot({ url, type: "image/jpeg", name: "photo.jpg" });
    setEditing(true);
  };

  const onPick = (file?: File) => {
    if (!file) return;
    setShot({ url: URL.createObjectURL(file), type: file.type, name: file.name });
    setEditing(true);
  };

  if (editing && shot) {
    return (
      <MediaEditor
        media={shot}
        kind={mode === "REEL" ? "reel" : "post"}
        onBack={() => {
          setEditing(false);
          setShot(null);
        }}
        onNext={() => {
          setEditing(false);
          setComposer(true);
        }}
      />
    );
  }

  if (composer && shot) {
    return (
      <Composer
        media={shot}
        kind={mode === "REEL" ? "reel" : "post"}
        onBack={() => {
          setComposer(false);
          setEditing(true);
        }}
      />
    );
  }

  return (
    <main className="fixed inset-0 z-40 overflow-hidden bg-background">
      <video
        ref={videoRef}
        playsInline
        muted
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
          camReady ? "opacity-100" : "opacity-0",
          facing === "user" && "-scale-x-100",
        )}
      />
      {!camReady && (
        <div className="absolute inset-0 grid place-items-center px-8 text-center">
          <p className="text-sm text-muted-foreground">
            {camDenied
              ? "Camera access is off. You can still pick something from your gallery."
              : "Starting camera…"}
          </p>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/70 via-transparent to-background/85" />

      {/* top bar */}
      <header className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-4">
        <IconBtn label="Close" onClick={() => navigate({ to: "/" })}>
          <X className="h-5 w-5" />
        </IconBtn>
        <div className="flex items-center gap-2">
          <IconBtn label="Flash" onClick={() => setFlash((f) => !f)} active={flash}>
            {flash ? <Zap className="h-5 w-5" /> : <ZapOff className="h-5 w-5" />}
          </IconBtn>
          <IconBtn
            label="Switch camera"
            onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
          >
            <SwitchCamera className="h-5 w-5" />
          </IconBtn>
        </div>
      </header>

      {recording && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-destructive px-3 py-1 font-ui text-[11px] font-semibold text-destructive-foreground">
          ● {String(Math.floor(recSecs / 60)).padStart(2, "0")}:
          {String(recSecs % 60).padStart(2, "0")}
        </div>
      )}

      {/* bottom controls */}
      <div className="safe-bottom absolute inset-x-0 bottom-0 px-4 pb-5">
        <div className="mb-5 grid grid-cols-[56px_minmax(0,1fr)_56px] items-center">
          <button
            onClick={() => fileRef.current?.click()}
            aria-label="Open gallery"
            className="grid h-11 w-11 place-items-center rounded-2xl border border-border/60 bg-background/40 backdrop-blur-xl transition-transform active:scale-90"
          >
            <Images className="h-5 w-5 text-foreground" />
          </button>

          <div className="flex justify-center">
            <button
              onClick={onShutter}
              aria-label={`Capture ${mode.toLowerCase()}`}
              className="grid h-[78px] w-[78px] place-items-center rounded-full border-[3px] border-foreground/85 transition-transform duration-200 active:scale-90"
            >
              <span
                className={cn(
                  "transition-all duration-300",
                  mode === "REEL" && recording
                    ? "h-7 w-7 rounded-[10px] bg-destructive"
                    : mode === "LIVE"
                      ? "h-[62px] w-[62px] rounded-full bg-destructive"
                      : "h-[62px] w-[62px] rounded-full brand-gradient",
                )}
              />
            </button>
          </div>

          <div className="flex justify-end">
            {mode === "LIVE" ? (
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-border/60 bg-background/40 backdrop-blur-xl">
                <Radio className="h-5 w-5 text-destructive" />
              </span>
            ) : (
              <span className="h-11 w-11" />
            )}
          </div>
        </div>

        {/* mode selector */}
        <div className="flex items-center justify-center gap-1 overflow-x-auto">
          {MODES.map((m) => (
            <button
              key={m}
              onClick={() => {
                if (recording) stopRecording();
                setMode(m);
              }}
              className={cn(
                "rounded-full px-4 py-2 font-ui text-[11.5px] font-semibold tracking-[0.14em] transition-all duration-300",
                mode === m
                  ? "bg-foreground/12 text-foreground backdrop-blur-xl"
                  : "text-muted-foreground/70",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={mode === "REEL" ? "video/*" : "image/*,video/*"}
        hidden
        onChange={(e) => onPick(e.target.files?.[0])}
      />
    </main>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid h-10 w-10 place-items-center rounded-full border border-border/50 bg-background/40 text-foreground backdrop-blur-xl transition-transform active:scale-90",
        active && "bg-foreground/15",
      )}
    >
      {children}
    </button>
  );
}

/* ---------------- post / reel composer (all original settings kept) ---------------- */

function Composer({
  media,
  kind,
  onBack,
}: {
  media: { url: string; type: string; name: string };
  kind: "post" | "reel";
  onBack: () => void;
}) {
  const { drafts, addDraft, removeDraft } = useYw();
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [audience, setAudience] = useState("everyone");
  const [allowDownload, setAllowDownload] = useState(true);

  const saveDraft = () => {
    addDraft({
      id: `d-${Date.now()}`,
      caption: caption || "Untitled draft",
      hashtags,
      privacy,
      audience,
      allowDownload,
      mediaName: media.name,
    });
    toast.success("Saved to drafts");
    onBack();
  };

  const publish = () => {
    toast.success(kind === "reel" ? "Reel posted" : "Posted to your world");
    onBack();
  };

  return (
    <main className="px-4 pb-6">
      <header className="sticky top-0 z-40 -mx-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border glass px-4 py-3">
        <button onClick={onBack} aria-label="Back to camera">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="truncate font-display text-xl font-bold">
          {kind === "reel" ? "New reel" : "New post"}
        </h1>
        <Button
          size="sm"
          className="rounded-full brand-gradient text-primary-foreground"
          onClick={publish}
        >
          Share
        </Button>
      </header>

      <section className="pt-4">
        <div className="relative overflow-hidden rounded-2xl bg-secondary">
          {media.type.startsWith("video") ? (
            <video src={media.url} controls className="aspect-square w-full object-cover" />
          ) : (
            <img src={media.url} alt="Captured media" className="aspect-square w-full object-cover" />
          )}
        </div>
      </section>

      <section className="space-y-4 pt-5">
        <div className="space-y-2">
          <Label htmlFor="caption">Caption</Label>
          <Textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Say something about this moment…"
            className="min-h-24 resize-none border-0 bg-secondary"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hashtags">Hashtags</Label>
          <Input
            id="hashtags"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="#tokyo #neon #nightwalk"
            className="h-11 border-0 bg-secondary"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Privacy</Label>
            <Select value={privacy} onValueChange={setPrivacy}>
              <SelectTrigger className="h-11 border-0 bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="followers">Followers only</SelectItem>
                <SelectItem value="private">Only me</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Audience</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger className="h-11 border-0 bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone</SelectItem>
                <SelectItem value="close">Close friends</SelectItem>
                <SelectItem value="custom">Custom list</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-secondary px-4 py-3">
          <div className="min-w-0 pr-3">
            <p className="text-sm font-semibold">Allow downloads</p>
            <p className="text-xs text-muted-foreground">
              Viewers can save this with the YW watermark
            </p>
          </div>
          <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
        </div>

        <Button variant="secondary" className="h-11 w-full rounded-full" onClick={saveDraft}>
          Save draft
        </Button>
      </section>

      {drafts.length > 0 && (
        <section className="pt-6">
          <h2 className="pb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Drafts
          </h2>
          <ul className="space-y-2">
            {drafts.map((d) => (
              <li
                key={d.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-secondary px-3 py-3"
              >
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm">{d.caption}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.privacy} · {d.audience}
                    {d.mediaName ? ` · ${d.mediaName}` : ""}
                  </p>
                </div>
                <button onClick={() => removeDraft(d.id)} aria-label="Delete draft">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
