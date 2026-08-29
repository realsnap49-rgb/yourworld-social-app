import React, { useCallback, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Upload, Image as ImageIcon, Clock, Loader2, Camera } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  VIDEO_CATEGORIES,
  formatDuration,
  publishLongVideo,
} from "@/lib/video-data";
import { useUploads } from "@/lib/upload-progress";

export const Route = createFileRoute("/video/upload")({
  head: () => ({
    meta: [
      { title: "Upload a Long Video — YourWorld" },
      {
        name: "description",
        content:
          "Upload long-form horizontal or vertical videos to YourWorld with a title, description, custom thumbnail, categories and scheduled release.",
      },
      { property: "og:title", content: "Upload a Long Video — YourWorld" },
      {
        property: "og:description",
        content: "Publish or schedule long-form videos with thumbnails and categories.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VideoUploadPage,
});

function VideoUploadPage() {
  const navigate = useNavigate();
  const { startUpload } = useUploads();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoInput = useRef<HTMLInputElement | null>(null);
  const thumbInput = useRef<HTMLInputElement | null>(null);

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [duration, setDuration] = useState<number | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const [scheduled, setScheduled] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const [busy, setBusy] = useState(false);

  const pickVideo = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Please choose a video file");
      return;
    }
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    setThumb(null);
    setDuration(null);
  };

  const onMeta = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setOrientation(v.videoHeight > v.videoWidth ? "portrait" : "landscape");
    setDuration(Number.isFinite(v.duration) ? v.duration : null);
  }, []);

  /** Grabs the current preview frame as a custom thumbnail. */
  const grabFrame = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    setThumb(canvas.toDataURL("image/jpeg", 0.85));
    toast.success("Thumbnail captured from this frame");
  };

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const scheduledAt = scheduled && date && time ? new Date(`${date}T${time}`) : null;
  const tooShort = duration !== null && duration < MIN_DURATION;
  const canPublish =
    !!fileUrl &&
    !tooShort &&
    title.trim().length >= 2 &&
    (!scheduled || !!scheduledAt) &&
    !busy;

  const submit = () => {
    if (!fileUrl) return;
    if (duration === null || duration < MIN_DURATION) {
      toast.error("Long videos must be at least 90 seconds.");
      return;
    }
    if (scheduled && scheduledAt && scheduledAt.getTime() <= Date.now()) {
      toast.error("Pick a future date and time to schedule");
      return;
    }

    setBusy(true);

    // Upload keeps running in the background while the user browses the app.
    void startUpload(
      { kind: "video", label: title.trim() || "Long video", thumbnail: thumb, viewTo: "/" },
      (onProgress) =>
        publishLongVideo({
          fileUrl,
          thumbnailUrl: thumb,
          title,
          description,
          tags,
          orientation,
          durationSeconds: duration,
          scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
          onProgress,
        }),
    ).then(({ error }) => {
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(
        scheduledAt
          ? `Scheduled for ${scheduledAt.toLocaleString()}`
          : "Published — it's live on your feed",
      );
    });

    navigate({ to: "/" });
  };

  return (
    <main className="min-h-screen bg-[#0d0d0f] pb-32 text-white">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-zinc-900 bg-[#0d0d0f]/90 px-4 py-3 backdrop-blur-md">
        <button
          onClick={() => navigate({ to: "/" })}
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full bg-zinc-900 active:scale-90"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold">Upload Video</h1>
      </header>

      <div className="mx-auto max-w-xl space-y-5 px-4 pt-5">
        {/* PLAYER / PICKER */}
        {!fileUrl ? (
          <button
            onClick={() => videoInput.current?.click()}
            className="flex w-full flex-col items-center gap-3 rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-14 text-center active:scale-[0.99]"
          >
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600">
              <Upload size={24} />
            </div>
            <p className="font-semibold">Select a long video</p>
            <p className="text-xs text-zinc-400">
              Horizontal (16:9) or vertical (9:16) · 1 minute to several hours
            </p>
          </button>
        ) : (
          <div className="space-y-2">
            <div
              className={`relative mx-auto w-full overflow-hidden rounded-2xl bg-black ${
                orientation === "portrait" ? "max-w-[280px] aspect-[9/16]" : "aspect-video"
              }`}
            >
              <video
                ref={videoRef}
                src={fileUrl}
                controls
                playsInline
                onLoadedMetadata={onMeta}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>
                {orientation === "portrait" ? "Vertical 9:16" : "Horizontal 16:9"} ·{" "}
                {formatDuration(duration)}
              </span>
              <button
                onClick={() => videoInput.current?.click()}
                className="font-semibold text-pink-400"
              >
                Change video
              </button>
            </div>
          </div>
        )}
        <input
          ref={videoInput}
          type="file"
          accept="video/*"
          hidden
          onChange={(e) => pickVideo(e.target.files?.[0])}
        />

        {/* TITLE */}
        <Field label="Video Title">
          <Input
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your video a title"
            className="h-11 rounded-xl border-zinc-800 bg-zinc-900/60"
          />
        </Field>

        {/* DESCRIPTION */}
        <Field label="Description / Captions">
          <Textarea
            value={description}
            maxLength={2000}
            rows={5}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell viewers about this video…"
            className="min-h-28 rounded-xl border-zinc-800 bg-zinc-900/60 leading-relaxed"
          />
          <p className="pt-1 text-right text-[11px] text-zinc-500">{description.length}/2000</p>
        </Field>

        {/* THUMBNAIL */}
        <Field label="Custom Thumbnail">
          <div className="flex items-center gap-3">
            <div
              className={`overflow-hidden rounded-xl bg-zinc-900 ${
                orientation === "portrait" ? "h-28 w-16" : "h-20 w-36"
              }`}
            >
              {thumb ? (
                <img src={thumb} alt="Custom video thumbnail" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-zinc-600">
                  <ImageIcon size={20} />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="secondary"
                className="h-9 rounded-full text-xs"
                onClick={() => thumbInput.current?.click()}
              >
                <ImageIcon size={14} className="mr-1.5" /> Upload image
              </Button>
              <Button
                variant="secondary"
                className="h-9 rounded-full text-xs"
                disabled={!fileUrl}
                onClick={grabFrame}
              >
                <Camera size={14} className="mr-1.5" /> Use current frame
              </Button>
            </div>
          </div>
          <input
            ref={thumbInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setThumb(URL.createObjectURL(f));
            }}
          />
        </Field>

        {/* CATEGORIES */}
        <Field label="Category / Tags">
          <div className="flex flex-wrap gap-2">
            {VIDEO_CATEGORIES.map((c) => {
              const active = tags.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleTag(c)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                    active ? "bg-white text-black" : "bg-zinc-900 text-zinc-400"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </Field>

        {/* SCHEDULE */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-pink-400" />
              <div>
                <p className="text-sm font-semibold">Schedule Post</p>
                <p className="text-[11px] text-zinc-400">Release this video at a future time</p>
              </div>
            </div>
            <Switch checked={scheduled} onCheckedChange={setScheduled} />
          </div>
          {scheduled && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 rounded-xl border-zinc-800 bg-zinc-900/60"
              />
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-11 rounded-xl border-zinc-800 bg-zinc-900/60"
              />
            </div>
          )}
        </div>

        <Button
          className="h-12 w-full rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-base font-bold"
          disabled={!canPublish}
          onClick={submit}
        >
          {busy && <Loader2 size={18} className="mr-2 animate-spin" />}
          {scheduled ? "Schedule" : "Publish"}
        </Button>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="pb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      {children}
    </div>
  );
}
