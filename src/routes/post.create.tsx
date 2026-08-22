import React, { useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ImagePlus, Loader2, MapPin, Hash, Download, Users } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { publishPost } from "@/lib/social-data";

export const Route = createFileRoute("/post/create")({
  head: () => ({
    meta: [
      { title: "Create a Post — YourWorld" },
      {
        name: "description",
        content:
          "Share a photo or video post on YourWorld with a caption, hashtags, location and audience controls.",
      },
      { property: "og:title", content: "Create a Post — YourWorld" },
      {
        property: "og:description",
        content: "Post a photo or video with caption, hashtags and location to your YourWorld feed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PostCreatePage,
});

function PostCreatePage() {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement | null>(null);

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [location, setLocation] = useState("");
  const [allowDownload, setAllowDownload] = useState(true);
  const [closeFriends, setCloseFriends] = useState(false);
  const [busy, setBusy] = useState(false);

  const hashtags = useMemo(
    () =>
      tags
        .split(/[\s,]+/)
        .map((t) => t.replace(/^#/, "").trim())
        .filter(Boolean),
    [tags],
  );

  const pick = (file: File | undefined) => {
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    if (!isVideo && !file.type.startsWith("image/")) {
      toast.error("Choose a photo or a video");
      return;
    }
    setMediaType(isVideo ? "video" : "image");
    setFileUrl(URL.createObjectURL(file));
  };

  const submit = async () => {
    if (!fileUrl) return;
    setBusy(true);
    const { error } = await publishPost({
      fileUrl,
      mediaType,
      caption,
      hashtags,
      location: location.trim() || null,
      allowDownload,
      audience: closeFriends ? "close_friends" : "everyone",
    });
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Posted — it's live on your feed");
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
        <h1 className="text-lg font-bold">New Post</h1>
      </header>

      <div className="mx-auto max-w-xl space-y-5 px-4 pt-5">
        {!fileUrl ? (
          <button
            onClick={() => fileInput.current?.click()}
            className="flex w-full flex-col items-center gap-3 rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-14 text-center active:scale-[0.99]"
          >
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600">
              <ImagePlus size={24} />
            </div>
            <p className="font-semibold">Select a photo or video</p>
            <p className="text-xs text-zinc-400">It will be shared to your Home feed</p>
          </button>
        ) : (
          <div className="space-y-2">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black">
              {mediaType === "video" ? (
                <video src={fileUrl} controls playsInline className="h-full w-full object-cover" />
              ) : (
                <img src={fileUrl} alt="Post preview" className="h-full w-full object-cover" />
              )}
            </div>
            <button
              onClick={() => fileInput.current?.click()}
              className="w-full text-right text-[11px] font-semibold text-pink-400"
            >
              Change media
            </button>
          </div>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={(e) => pick(e.target.files?.[0])}
        />

        <div>
          <p className="pb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">Caption</p>
          <Textarea
            value={caption}
            maxLength={2200}
            rows={4}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption…"
            className="min-h-24 rounded-xl border-zinc-800 bg-zinc-900/60 leading-relaxed"
          />
        </div>

        <div>
          <p className="flex items-center gap-1.5 pb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            <Hash size={12} /> Hashtags
          </p>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="travel, sunset, night"
            className="h-11 rounded-xl border-zinc-800 bg-zinc-900/60"
          />
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {hashtags.map((t) => (
                <span key={t} className="rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] text-pink-400">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="flex items-center gap-1.5 pb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            <MapPin size={12} /> Location
          </p>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Add a place"
            className="h-11 rounded-xl border-zinc-800 bg-zinc-900/60"
          />
        </div>

        <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-pink-400" />
              <div>
                <p className="text-sm font-semibold">Close friends only</p>
                <p className="text-[11px] text-zinc-400">Limit who can see this post</p>
              </div>
            </div>
            <Switch checked={closeFriends} onCheckedChange={setCloseFriends} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download size={16} className="text-pink-400" />
              <div>
                <p className="text-sm font-semibold">Allow downloads</p>
                <p className="text-[11px] text-zinc-400">Viewers can save this post</p>
              </div>
            </div>
            <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
          </div>
        </div>

        <Button
          className="h-12 w-full rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-base font-bold"
          disabled={!fileUrl || busy}
          onClick={submit}
        >
          {busy && <Loader2 size={18} className="mr-2 animate-spin" />}
          Share Post
        </Button>
      </div>
    </main>
  );
}
