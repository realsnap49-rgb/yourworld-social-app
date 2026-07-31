import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
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
      { title: "Your Moment — YourWorld" },
      {
        name: "description",
        content:
          "Create a photo, video or text moment with AI camera tools, effects, music, stickers, polls and privacy controls on YourWorld.",
      },
      { property: "og:title", content: "Your Moment — YourWorld" },
      {
        property: "og:description",
        content: "AI camera, effects, music, stickers, polls and 12h or 24h privacy-first moments.",
      },
    ],
  }),
  component: MomentComposer,
});

const KINDS: { id: MomentKind; label: string; icon: typeof Camera }[] = [
  { id: "photo", label: "Photo", icon: Camera },
  { id: "video", label: "Video", icon: VideoIcon },
  { id: "text", label: "Text", icon: Type },
];

const AI_TOOLS: { id: AiTool; label: string; icon: typeof Sparkles }[] = [
  { id: "beauty", label: "AI Beauty", icon: Sparkles },
  { id: "filter", label: "Face Filters", icon: Smile },
  { id: "background", label: "Background", icon: Wand2 },
  { id: "cartoon", label: "Cartoon", icon: Clapperboard },
  { id: "eraser", label: "Magic Eraser", icon: Eraser },
];

const EFFECTS: { id: MomentEffect; label: string; icon: typeof Repeat }[] = [
  { id: "boomerang", label: "Boomerang", icon: Repeat },
  { id: "slowmo", label: "Slow Motion", icon: Timer },
  { id: "reverse", label: "Reverse", icon: Rewind },
  { id: "greenscreen", label: "Green Screen", icon: Clapperboard },
];

const PRIVACY: { id: MomentPrivacy; label: string; hint: string }[] = [
  { id: "everyone", label: "Everyone", hint: "Anyone on YourWorld" },
  { id: "followers", label: "Followers", hint: "People who follow you" },
  { id: "close", label: "Close Friends", hint: "Your green-list only" },
  { id: "onlyme", label: "Only Me", hint: "Private to you" },
];

function MomentComposer() {
  const navigate = useNavigate();
  const { addMoment } = useMoments();

  const [kind, setKind] = useState<MomentKind>("photo");
  const [media, setMedia] = useState<{ url: string; type: string } | null>(null);
  const [text, setText] = useState("");
  const [textBg, setTextBg] = useState(TEXT_BACKGROUNDS[0]!);
  const [music, setMusic] = useState<string | undefined>();
  const [stickers, setStickers] = useState<Sticker[]>([]);
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
  const [sheet, setSheet] = useState<null | "music" | "stickers" | "location" | "mentions">(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const filter = useMemo(() => aiFilterCss(ai, effect), [ai, effect]);

  const pick = (accept: string) => {
    if (!fileRef.current) return;
    fileRef.current.accept = accept;
    fileRef.current.click();
  };

  const onFile = (file?: File) => {
    if (!file) return;
    setMedia({ url: URL.createObjectURL(file), type: file.type });
    setKind(file.type.startsWith("video") ? "video" : "photo");
  };

  const addSticker = (content: string, type: "emoji" | "gif") =>
    setStickers((p) => [
      ...p,
      {
        id: `s-${Date.now()}-${p.length}`,
        content,
        type,
        x: 0.3 + Math.random() * 0.4,
        y: 0.25 + Math.random() * 0.4,
        scale: 1,
      },
    ]);

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

  return (
    <main className="grain relative min-h-screen pb-10">
      <div aria-hidden className="ambient-canvas" />

      <header className="header-lux sticky top-0 z-40 flex h-[54px] items-center justify-between gap-3 px-3">
        <button
          aria-label="Back"
          onClick={() => navigate({ to: "/" })}
          className="icon-pill grid h-9 w-9 place-items-center active:scale-90"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.7} />
        </button>
        <h1 className="font-ui text-[17px] font-semibold tracking-[-0.02em]">Your Moment</h1>
        <Button
          size="sm"
          onClick={share}
          className="rounded-full brand-gradient px-4 text-primary-foreground"
        >
          Share
        </Button>
      </header>

      <input
        ref={fileRef}
        type="file"
        hidden
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      {/* kind switcher */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-secondary p-1">
          {KINDS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setKind(id)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-semibold transition-all",
                kind === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* canvas */}
      <section className="px-4 pt-4">
        <div
          className="relative aspect-9/16 w-full overflow-hidden rounded-[28px] border border-border bg-secondary"
          style={kind === "text" ? { background: textBg } : undefined}
        >
          {kind !== "text" && media ? (
            media.type.startsWith("video") ? (
              <video
                src={media.url}
                autoPlay
                loop
                muted
                playsInline
                style={{ filter, animationDirection: effect === "reverse" ? "reverse" : undefined }}
                className={cn(
                  "h-full w-full object-cover",
                  effect === "slowmo" && "[--x:1]",
                )}
                ref={(el) => {
                  if (el) el.playbackRate = effect === "slowmo" ? 0.5 : 1;
                }}
              />
            ) : (
              <img
                src={media.url}
                alt="Moment preview"
                style={{ filter }}
                className={cn(
                  "h-full w-full object-cover",
                  effect === "boomerang" && "animate-pulse",
                )}
              />
            )
          ) : kind === "text" ? (
            <div className="grid h-full w-full place-items-center p-6">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your moment…"
                className="w-full resize-none border-0 bg-transparent text-center font-display text-2xl font-bold leading-snug text-white outline-none placeholder:text-white/60"
                rows={5}
              />
            </div>
          ) : (
            <div className="grid h-full w-full place-items-center gap-3 p-6 text-center">
              <div className="grid gap-3">
                <p className="text-sm text-muted-foreground">Capture or upload your moment</p>
                <div className="flex justify-center gap-2">
                  <Button
                    variant="secondary"
                    className="rounded-full"
                    onClick={() => pick("image/*")}
                  >
                    <Camera className="mr-1.5 h-4 w-4" /> Photo
                  </Button>
                  <Button
                    variant="secondary"
                    className="rounded-full"
                    onClick={() => pick("video/*")}
                  >
                    <VideoIcon className="mr-1.5 h-4 w-4" /> Video
                  </Button>
                </div>
              </div>
            </div>
          )}

          {kind !== "text" && media && text.trim() && (
            <p className="pointer-events-none absolute inset-x-4 bottom-16 text-center font-display text-lg font-bold text-white drop-shadow-lg">
              {text}
            </p>
          )}

          {stickers.map((s) => (
            <button
              key={s.id}
              onClick={() => setStickers((p) => p.filter((x) => x.id !== s.id))}
              style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-3xl drop-shadow-lg active:scale-90"
              aria-label="Remove sticker"
            >
              {s.content}
            </button>
          ))}

          {/* overlay chips */}
          <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
            {music && <Chip icon={<Music2 className="h-3 w-3" />}>{music}</Chip>}
            {location && <Chip icon={<MapPin className="h-3 w-3" />}>{location}</Chip>}
            {mentions.length > 0 && (
              <Chip icon={<AtSign className="h-3 w-3" />}>{mentions.length} mentioned</Chip>
            )}
            {effect !== "none" && <Chip icon={<Sparkles className="h-3 w-3" />}>{effect}</Chip>}
          </div>

          {pollOn && pollQ.trim() && (
            <div className="absolute inset-x-5 bottom-5 rounded-2xl bg-black/45 p-3 backdrop-blur-md">
              <p className="text-center text-sm font-semibold text-white">{pollQ}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[pollA, pollB].map((o, i) => (
                  <span
                    key={i}
                    className="rounded-xl bg-white/15 py-1.5 text-center text-xs font-semibold text-white"
                  >
                    {o}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {(media || kind === "text") && (
          <div className="flex items-center justify-between pt-3">
            <div className="flex gap-1.5">
              <ToolBtn label="Music" icon={<Music2 />} onClick={() => setSheet("music")} active={!!music} />
              <ToolBtn label="Stickers" icon={<Smile />} onClick={() => setSheet("stickers")} active={stickers.length > 0} />
              <ToolBtn label="Location" icon={<MapPin />} onClick={() => setSheet("location")} active={!!location} />
              <ToolBtn label="Mention" icon={<AtSign />} onClick={() => setSheet("mentions")} active={mentions.length > 0} />
            </div>
            {kind !== "text" && (
              <button
                onClick={() => setMedia(null)}
                className="icon-pill grid h-9 w-9 place-items-center active:scale-90"
                aria-label="Remove media"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </section>

      {kind === "text" && (
        <section className="px-4 pt-4">
          <SectionTitle>Background</SectionTitle>
          <div className="flex gap-2">
            {TEXT_BACKGROUNDS.map((bg) => (
              <button
                key={bg}
                onClick={() => setTextBg(bg)}
                style={{ background: bg }}
                className={cn(
                  "h-10 w-10 rounded-full ring-offset-2 ring-offset-background transition",
                  textBg === bg && "ring-2 ring-primary",
                )}
                aria-label="Background option"
              />
            ))}
          </div>
        </section>
      )}

      {kind !== "text" && (
        <>
          <section className="px-4 pt-5">
            <SectionTitle>AI Camera</SectionTitle>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              {AI_TOOLS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setAi((p) => ({ ...p, [id]: !p[id] }))}
                  className={cn(
                    "flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border px-3 py-2.5 transition-all active:scale-95",
                    ai[id]
                      ? "border-primary/60 bg-primary/12 text-foreground"
                      : "border-border bg-secondary/60 text-muted-foreground",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                  <span className="text-[11px] font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="px-4 pt-5">
            <SectionTitle>Best Effects</SectionTitle>
            <div className="grid grid-cols-4 gap-2">
              {EFFECTS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setEffect((p) => (p === id ? "none" : id))}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 transition-all active:scale-95",
                    effect === id
                      ? "border-primary/60 bg-primary/12 text-foreground"
                      : "border-border bg-secondary/60 text-muted-foreground",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                  <span className="text-[10.5px] font-semibold leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="px-4 pt-5">
        <SectionTitle>Privacy</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {PRIVACY.map((p) => (
            <button
              key={p.id}
              onClick={() => setPrivacy(p.id)}
              className={cn(
                "rounded-2xl border px-3 py-2.5 text-left transition-all active:scale-[0.98]",
                privacy === p.id ? "border-primary/60 bg-primary/12" : "border-border bg-secondary/60",
              )}
            >
              <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                {p.label}
                {privacy === p.id && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
              </span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">{p.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="px-4 pt-5">
        <SectionTitle>Duration</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {([12, 24] as const).map((h) => (
            <button
              key={h}
              onClick={() => setDuration(h)}
              className={cn(
                "rounded-2xl border py-3 text-[13px] font-semibold transition-all active:scale-[0.98]",
                duration === h ? "border-primary/60 bg-primary/12" : "border-border bg-secondary/60",
              )}
            >
              {h} Hours
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2 px-4 pt-5">
        <SectionTitle>Interaction & Safety</SectionTitle>

        <Row
          icon={<BarChart3 className="h-4 w-4" />}
          title="Add a poll"
          hint="Let viewers vote on your moment"
          checked={pollOn}
          onChange={setPollOn}
        />
        {pollOn && (
          <div className="space-y-2 rounded-2xl bg-secondary/60 p-3">
            <div className="space-y-1.5">
              <Label htmlFor="pollq" className="text-xs">Question</Label>
              <Input
                id="pollq"
                value={pollQ}
                onChange={(e) => setPollQ(e.target.value)}
                placeholder="Which shot should I post?"
                className="h-10 border-0 bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input value={pollA} onChange={(e) => setPollA(e.target.value)} className="h-10 border-0 bg-background" />
              <Input value={pollB} onChange={(e) => setPollB(e.target.value)} className="h-10 border-0 bg-background" />
            </div>
          </div>
        )}

        <Row
          icon={<Bell className="h-4 w-4" />}
          title="Screenshot alert"
          hint="Tell me when someone captures this moment"
          checked={screenshotAlert}
          onChange={setScreenshotAlert}
        />
        <Row
          icon={<Download className="h-4 w-4" />}
          title="Allow downloads"
          hint="Viewers can save it with the YW watermark"
          checked={allowDownload}
          onChange={setAllowDownload}
        />
        <Row
          icon={<Sparkles className="h-4 w-4" />}
          title="Save to archive"
          hint="Keep a private copy after it expires"
          checked={saveToArchive}
          onChange={setSaveToArchive}
        />
      </section>

      {kind !== "text" && (
        <section className="px-4 pt-5">
          <SectionTitle>Caption</SectionTitle>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Say something about this moment…"
            className="min-h-20 resize-none border-0 bg-secondary"
          />
        </section>
      )}

      <div className="px-4 pt-6">
        <Button
          onClick={share}
          className="h-12 w-full rounded-full brand-gradient text-primary-foreground"
        >
          Share moment
        </Button>
      </div>

      {/* sheets */}
      <Sheet open={sheet !== null} onOpenChange={(v) => !v && setSheet(null)}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="capitalize">{sheet ?? ""}</SheetTitle>
          </SheetHeader>

          {sheet === "music" && (
            <ul className="space-y-1.5 pt-3">
              {MOMENT_MUSIC.map((m) => (
                <li key={m}>
                  <button
                    onClick={() => {
                      setMusic(music === m ? undefined : m);
                      setSheet(null);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl bg-secondary/60 px-3 py-3 text-left active:scale-[0.99]"
                  >
                    <Music2 className="h-4 w-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm">{m}</span>
                    {music === m && <Check className="h-4 w-4 text-primary" />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {sheet === "stickers" && (
            <div className="space-y-4 pt-3">
              <div>
                <SectionTitle>Emoji</SectionTitle>
                <div className="grid grid-cols-8 gap-2">
                  {MOMENT_EMOJI.map((e) => (
                    <button
                      key={e}
                      onClick={() => addSticker(e, "emoji")}
                      className="grid h-10 place-items-center rounded-xl bg-secondary/60 text-xl active:scale-90"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <SectionTitle>GIFs</SectionTitle>
                <div className="grid grid-cols-3 gap-2">
                  {MOMENT_GIFS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => addSticker(g.content, "gif")}
                      className="flex h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-secondary/60 active:scale-95"
                    >
                      <span className="animate-pulse text-xl">{g.content}</span>
                      <span className="text-[10px] text-muted-foreground">{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {sheet === "location" && (
            <ul className="space-y-1.5 pt-3">
              {MOMENT_LOCATIONS.map((l) => (
                <li key={l}>
                  <button
                    onClick={() => {
                      setLocation(location === l ? undefined : l);
                      setSheet(null);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl bg-secondary/60 px-3 py-3 text-left active:scale-[0.99]"
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm">{l}</span>
                    {location === l && <Check className="h-4 w-4 text-primary" />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {sheet === "mentions" && (
            <ul className="space-y-1.5 pt-3">
              {users.map((u) => {
                const on = mentions.includes(u.id);
                return (
                  <li key={u.id}>
                    <button
                      onClick={() =>
                        setMentions((p) => (on ? p.filter((x) => x !== u.id) : [...p, u.id]))
                      }
                      className="flex w-full items-center gap-3 rounded-2xl bg-secondary/60 px-3 py-3 text-left active:scale-[0.99]"
                    >
                      <AtSign className="h-4 w-4 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm">{u.username}</span>
                      {on && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </h2>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex max-w-[60%] items-center gap-1 truncate rounded-full bg-black/45 px-2 py-1 text-[10.5px] font-semibold capitalize text-white backdrop-blur-md">
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

function ToolBtn({
  label,
  icon,
  onClick,
  active,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full border transition-all active:scale-90 [&_svg]:h-[17px] [&_svg]:w-[17px]",
        active ? "border-primary/60 bg-primary/15 text-foreground" : "border-border bg-secondary/60 text-muted-foreground",
      )}
    >
      {icon}
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
    <div className="flex items-center justify-between rounded-2xl bg-secondary/60 px-3.5 py-3">
      <div className="flex min-w-0 items-start gap-3 pr-3">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}