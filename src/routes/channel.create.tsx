import { useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Camera, Image as ImageIcon, Globe2, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  CHANNEL_CATEGORIES,
  COUNTRIES,
  emptyChannel,
  useChannel,
  type Channel,
} from "@/lib/channel-store";

export const Route = createFileRoute("/channel/create")({
  head: () => ({
    meta: [
      { title: "Create your Channel — YourWorld" },
      {
        name: "description",
        content:
          "Set up a YourWorld Channel with a logo, banner, category and description. Publish videos, reels and posts to your subscribers.",
      },
      { property: "og:title", content: "Create your Channel — YourWorld" },
      {
        property: "og:description",
        content: "Launch a premium channel with analytics, subscribers and monetization.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChannelCreate,
});

function ChannelCreate() {
  const { channel, hasChannel, saveChannel } = useChannel();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Channel>(channel ?? emptyChannel());
  const logoInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Channel>(k: K, v: Channel[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const pick = (file: File | undefined, key: "logo" | "banner") => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8 MB");
      return;
    }
    set(key, URL.createObjectURL(file));
  };

  const valid = draft.name.trim().length >= 2 && draft.handle.trim().length >= 3;

  return (
    <main className="min-h-screen pb-12">
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-border glass px-3 py-3">
        <Link
          to={hasChannel ? "/channel" : "/settings"}
          aria-label="Go back"
          className="grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
        </Link>
        <h1 className="font-display text-lg font-bold">
          {hasChannel ? "Edit Channel" : "Create Channel"}
        </h1>
      </header>

      <div className="px-4 pt-4">
        <div className="surface-card overflow-hidden rounded-3xl">
          <div className="relative h-32 w-full bg-secondary">
            {draft.banner ? (
              <img src={draft.banner} alt="Channel banner preview" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
                Channel banner
              </div>
            )}
            <button
              type="button"
              onClick={() => bannerInput.current?.click()}
              className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-background/70 px-3 py-1.5 text-[11px] font-medium backdrop-blur transition-transform active:scale-95"
            >
              <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.7} />
              Banner
            </button>
            <input
              ref={bannerInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => pick(e.target.files?.[0], "banner")}
            />
          </div>

          <div className="flex items-center gap-3 p-4">
            <button
              type="button"
              onClick={() => logoInput.current?.click()}
              aria-label="Change channel logo"
              className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary transition-transform active:scale-95"
            >
              {draft.logo ? (
                <img src={draft.logo} alt="Channel logo preview" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-5 w-5 text-muted-foreground" strokeWidth={1.7} />
              )}
            </button>
            <input
              ref={logoInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => pick(e.target.files?.[0], "logo")}
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Add a square logo and a wide banner. Images stay on your device until you publish.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-5">
        <Field label="Channel Name">
          <Input
            value={draft.name}
            maxLength={50}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Your channel name"
            className="h-11 rounded-xl"
          />
        </Field>

        <Field label="@ Username">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              @
            </span>
            <Input
              value={draft.handle}
              maxLength={30}
              onChange={(e) => set("handle", e.target.value.replace(/[^\w.]/g, "").toLowerCase())}
              placeholder="channel.handle"
              className="h-11 rounded-xl pl-7"
            />
          </div>
        </Field>

        <Field label="Category">
          <div className="flex flex-wrap gap-2">
            {CHANNEL_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={draft.category === c}
                onClick={() => set("category", c)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                  draft.category === c
                    ? "bg-foreground text-background"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Description">
          <Textarea
            value={draft.description}
            maxLength={300}
            rows={5}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What your channel is about"
            className="min-h-28 rounded-xl leading-relaxed"
          />
          <p className="pt-1 text-right text-[11px] text-muted-foreground">
            {draft.description.length}/300
          </p>
        </Field>

        <Field label="Visibility">
          <div className="grid grid-cols-2 gap-2">
            <VisibilityTile
              icon={Globe2}
              label="Public"
              hint="Anyone can find and subscribe"
              active={draft.visibility === "public"}
              onClick={() => set("visibility", "public")}
            />
            <VisibilityTile
              icon={Lock}
              label="Private"
              hint="Only people you invite"
              active={draft.visibility === "private"}
              onClick={() => set("visibility", "private")}
            />
          </div>
        </Field>

        <Field label="Country (optional)">
          <div className="flex flex-wrap gap-2">
            {COUNTRIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={draft.country === c}
                onClick={() => set("country", draft.country === c ? "" : c)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                  draft.country === c
                    ? "bg-foreground text-background"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-4">
          <Button
            variant="secondary"
            className="h-11 rounded-full"
            onClick={() => navigate({ to: hasChannel ? "/channel" : "/settings" })}
          >
            Cancel
          </Button>
          <Button
            className="h-11 rounded-full"
            disabled={!valid}
            onClick={() => {
              saveChannel({ ...draft, createdAt: channel?.createdAt ?? Date.now() });
              toast.success(hasChannel ? "Channel updated" : "Channel created");
              navigate({ to: "/channel" });
            }}
          >
            <Sparkles className="mr-1.5 h-4 w-4" strokeWidth={1.8} />
            {hasChannel ? "Save Changes" : "Create Channel"}
          </Button>
        </div>
      </div>
    </main>
  );
}

function VisibilityTile({
  icon: Icon,
  label,
  hint,
  active,
  onClick,
}: {
  icon: typeof Globe2;
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-2xl px-3.5 py-3 text-left transition-all active:scale-95 ${
        active ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
      }`}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
      <span className="mt-1.5 block text-sm font-semibold">{label}</span>
      <span className="block text-[11px] opacity-80">{hint}</span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}
