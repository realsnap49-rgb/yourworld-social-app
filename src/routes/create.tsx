import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ImagePlus, Video, X, FileText, Trash2 } from "lucide-react";
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
import { toast } from "sonner";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Create — YourWorld" },
      {
        name: "description",
        content:
          "Upload a photo or video, write a caption with hashtags, pick privacy and audience, and save drafts on YourWorld.",
      },
      { property: "og:title", content: "Create — YourWorld" },
      {
        property: "og:description",
        content: "Post photos and videos with captions, hashtags, privacy and drafts.",
      },
    ],
  }),
  component: CreatePage,
});

function CreatePage() {
  const { drafts, addDraft, removeDraft } = useYw();
  const [preview, setPreview] = useState<{ url: string; type: string; name: string } | null>(null);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [audience, setAudience] = useState("everyone");
  const [allowDownload, setAllowDownload] = useState(true);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const onFile = (file?: File) => {
    if (!file) return;
    setPreview({ url: URL.createObjectURL(file), type: file.type, name: file.name });
  };

  const reset = () => {
    setPreview(null);
    setCaption("");
    setHashtags("");
  };

  const saveDraft = () => {
    addDraft({
      id: `d-${Date.now()}`,
      caption: caption || "Untitled draft",
      hashtags,
      privacy,
      audience,
      allowDownload,
      mediaName: preview?.name,
    });
    toast.success("Saved to drafts");
    reset();
  };

  const publish = () => {
    if (!preview) {
      toast("Add a photo or video first");
      return;
    }
    toast.success("Posted to your world");
    reset();
  };

  return (
    <main className="px-4 pb-6">
      <header className="sticky top-0 z-40 -mx-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border glass px-4 py-3">
        <h1 className="truncate font-display text-xl font-bold">New post</h1>
        <Button size="sm" className="rounded-full brand-gradient text-primary-foreground" onClick={publish}>
          Share
        </Button>
      </header>

      <section className="pt-4">
        {preview ? (
          <div className="relative overflow-hidden rounded-2xl bg-secondary">
            {preview.type.startsWith("video") ? (
              <video src={preview.url} controls className="aspect-square w-full object-cover" />
            ) : (
              <img src={preview.url} alt="Selected media" className="aspect-square w-full object-cover" />
            )}
            <button
              onClick={() => setPreview(null)}
              aria-label="Remove media"
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/70 backdrop-blur"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <UploadTile
              icon={<ImagePlus className="h-7 w-7" />}
              label="Upload photo"
              onClick={() => photoRef.current?.click()}
            />
            <UploadTile
              icon={<Video className="h-7 w-7" />}
              label="Upload video"
              onClick={() => videoRef.current?.click()}
            />
          </div>
        )}
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <input
          ref={videoRef}
          type="file"
          accept="video/*"
          hidden
          onChange={(e) => onFile(e.target.files?.[0])}
        />
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

function UploadTile({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-secondary/50 text-muted-foreground transition-transform active:scale-95"
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}