import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Mic,
  SendHorizonal,
  Check,
  CheckCheck,
  Play,
  Phone,
  Video,
  MoreVertical,
  Pencil,
  Lock,
  EyeOff,
  Timer,
  BellOff,
  UserX,
  Flag,
  MapPin,
  Navigation,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { YwAvatar } from "@/components/yw/Avatar";
import { VideoCallSheet } from "@/components/yw/VideoCallSheet";
import { QuickCaptureSheet } from "@/components/yw/QuickCaptureSheet";
import { MeetupSheet } from "@/components/yw/MeetupSheet";
import { LiveLocationSheet } from "@/components/yw/LiveLocationSheet";
import { useLiveLocation, remainingLabel } from "@/lib/live-location";
import { useOrbitOptional } from "@/lib/orbit-store";
import { byId, messagesByThread, threads, type Message } from "@/lib/yw-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/chat/$threadId")({
  loader: ({ params }) => {
    const thread = threads.find((t) => t.id === params.threadId);
    if (!thread) throw notFound();
    return { thread };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Conversation — YourWorld" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${loaderData.thread.title} — YourWorld Chat`;
    return {
      meta: [
        { title },
        { name: "description", content: `Conversation with ${loaderData.thread.title} on YourWorld.` },
        { name: "robots", content: "noindex" },
        { property: "og:title", content: title },
        { property: "og:description", content: "Private conversation on YourWorld." },
      ],
    };
  },
  component: ThreadPage,
  errorComponent: () => <ThreadFallback text="This conversation didn't load." />,
  notFoundComponent: () => <ThreadFallback text="This conversation no longer exists." />,
});

function ThreadFallback({ text }: { text: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Link to="/chat" className="rounded-full brand-gradient px-4 py-2 text-sm font-semibold text-primary-foreground">
        Back to chats
      </Link>
    </div>
  );
}

function ThreadPage() {
  const { thread } = Route.useLoaderData();
  const [messages, setMessages] = useState<Message[]>(messagesByThread[thread.id] ?? []);
  const [draft, setDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const [videoCall, setVideoCall] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [meetupOpen, setMeetupOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [viewOnce, setViewOnce] = useState<Record<string, number>>({});
  const { session: live, start: startLive, stop: stopLive } = useLiveLocation();
  const lead = byId(thread.userIds[0]);
  const connected = useOrbitOptional()?.connected ?? {};
  // Unlocked once you're connected in Orbit, or the conversation has started.
  const meetupUnlocked =
    thread.kind !== "group" &&
    (messages.length > 0 || thread.userIds.some((id: string) => connected[id]));
  const locationUnlocked = meetupUnlocked;

  const pushMessage = (body: string) =>
    setMessages((p) => [
      ...p,
      { id: `mu-${Date.now()}`, from: "me", kind: "text", body, time: "now", read: false },
    ]);

  const send = () => {
    if (!draft.trim()) return;
    setMessages((p) => [
      ...p,
      {
        id: `m-${Date.now()}`,
        from: "me",
        kind: "text",
        body: draft.trim(),
        time: "now",
        read: false,
      },
    ]);
    setDraft("");
  };

  const sendVoice = () => {
    setRecording(true);
    window.setTimeout(() => {
      setRecording(false);
      setMessages((p) => [
        ...p,
        {
          id: `v-${Date.now()}`,
          from: "me",
          kind: "voice",
          body: "",
          duration: "0:03",
          time: "now",
          read: false,
        },
      ]);
    }, 900);
  };

  return (
    <div className="relative flex min-h-[calc(100dvh-4.75rem)] flex-col">
      <header className="sticky top-0 z-40 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border glass px-3 py-2.5">
        <Link to="/chat" aria-label="Back" className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex min-w-0 items-center gap-2.5">
          <YwAvatar user={lead} size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{thread.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {thread.kind === "group" ? `${thread.userIds.length + 1} members` : thread.online ? "Active now" : "Offline"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button aria-label="Voice call" onClick={() => toast("Calls are coming soon")} className="p-1">
            <Phone className="h-5 w-5" strokeWidth={1.7} />
          </button>
          <button aria-label="Video call" onClick={() => setVideoCall(true)} className="p-1">
            <Video className="h-5 w-5" strokeWidth={1.7} />
          </button>
          <button aria-label="More options" onClick={() => setMenuOpen((v) => !v)} className="p-1">
            <MoreVertical className="h-5 w-5" strokeWidth={1.7} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <>
          <button
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-background/30 backdrop-blur-[2px]"
          />
          <div
            role="menu"
            className="absolute right-3 top-14 z-50 w-60 overflow-hidden rounded-2xl border border-border/60 bg-background/85 shadow-2xl backdrop-blur-xl animate-rise"
          >
            {[
              ...(meetupUnlocked
                ? [{ icon: MapPin, label: "Plan Meetup", action: "meetup" as const }]
                : []),
              ...(locationUnlocked
                ? [
                    {
                      icon: Navigation,
                      label: live.active ? "Stop Live Location" : "Share Live Location",
                      action: "live" as const,
                    },
                  ]
                : []),
              { icon: Pencil, label: "Change Display Name" },
              { icon: Lock, label: "Secret Lock Chat" },
              { icon: EyeOff, label: "View Once Mode" },
              { icon: Timer, label: "Auto Delete Messages" },
              { icon: BellOff, label: "Mute Notifications" },
              { icon: UserX, label: "Block User" },
              { icon: Flag, label: "Report User" },
            ].map(({ icon: Icon, label, ...rest }) => (
              <button
                key={label}
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  if ("action" in rest && rest.action === "meetup") setMeetupOpen(true);
                  else if ("action" in rest && rest.action === "live") {
                    if (live.active) {
                      stopLive();
                      pushMessage("📍 Live location sharing stopped.");
                      toast("Live location stopped");
                    } else {
                      setLiveOpen(true);
                    }
                  }
                  else toast(label);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] font-medium transition-colors hover:bg-foreground/10"
              >
                <Icon strokeWidth={1.6} className="h-[17px] w-[17px] text-muted-foreground" />
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      <VideoCallSheet open={videoCall} onClose={() => setVideoCall(false)} peer={lead} title={thread.title} />
      <QuickCaptureSheet
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={({ url, viewOnce: secs }) => {
          const id = `img-${Date.now()}`;
          if (secs > 0) setViewOnce((v) => ({ ...v, [id]: secs }));
          setMessages((p) => [
            ...p,
            { id, from: "me", kind: "image", body: "", image: url, time: "now", read: false },
          ]);
          toast(secs > 0 ? `Sent as view once · ${secs}s` : "Photo sent");
        }}
      />
      <MeetupSheet
        open={meetupOpen}
        onOpenChange={setMeetupOpen}
        onSend={(body) => {
          pushMessage(body);
          toast("Meetup suggestion sent");
        }}
      />
      <LiveLocationSheet
        open={liveOpen}
        onOpenChange={setLiveOpen}
        peerName={thread.title}
        onConfirm={async (duration) => {
          const ok = await startLive(duration);
          if (ok) {
            pushMessage(`📍 Sharing my live location ${remainingLabel(duration.ms === null ? null : Date.now() + duration.ms)}.`);
            toast("Live location is on — stop anytime");
          } else {
            toast("Location wasn't shared");
          }
          return ok;
        }}
      />

      {live.active && (
        <div className="sticky top-[3.6rem] z-30 mx-3 mt-2 flex items-center gap-2.5 rounded-2xl border border-border/60 bg-background/80 px-3.5 py-2.5 shadow-lg backdrop-blur-xl animate-rise">
          <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full brand-gradient">
            <Navigation className="h-4 w-4 text-primary-foreground" strokeWidth={1.9} />
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">Live location on</p>
            <p className="truncate text-[11px] text-muted-foreground">
              Sharing {remainingLabel(live.endsAt)}
              {live.accuracyM !== null && ` · ±${live.accuracyM} m`}
            </p>
          </div>
          <button
            onClick={() => {
              stopLive();
              pushMessage("📍 Live location sharing stopped.");
              toast("Live location stopped");
            }}
            className="shrink-0 rounded-full bg-destructive/15 px-3.5 py-1.5 text-xs font-semibold text-destructive transition-transform active:scale-95"
          >
            Stop
          </button>
        </div>
      )}

      <ul className="flex-1 space-y-2 px-3 py-4">
        {messages.map((m) => {
          const mine = m.from === "me";
          return (
            <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-3 py-2 text-sm",
                  mine ? "brand-gradient text-primary-foreground" : "bg-secondary",
                )}
              >
                {m.kind === "text" && (
                  <p className="whitespace-pre-line break-words">{m.body}</p>
                )}
                {m.kind === "image" && (viewOnce[m.id] ? (
                  <ViewOnceImage src={m.image ?? ""} seconds={viewOnce[m.id]} />
                ) : (
                  <img
                    src={m.image}
                    alt="Shared media"
                    loading="lazy"
                    className="h-44 w-44 rounded-xl object-cover"
                  />
                ))}
                {m.kind === "voice" && (
                  <span className="flex items-center gap-2 py-1">
                    <Play className="h-4 w-4 shrink-0" />
                    <span className="flex h-6 items-end gap-0.5">
                      {[6, 12, 18, 10, 22, 14, 8, 16, 11, 20, 7, 13].map((h, i) => (
                        <span
                          key={i}
                          className="w-0.5 rounded-full bg-current opacity-70"
                          style={{ height: h }}
                        />
                      ))}
                    </span>
                    <span className="text-xs">{m.duration}</span>
                  </span>
                )}
                <span
                  className={cn(
                    "mt-1 flex items-center justify-end gap-1 text-[10px]",
                    mine ? "opacity-80" : "text-muted-foreground",
                  )}
                >
                  {m.time}
                  {mine &&
                    (m.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="safe-bottom sticky bottom-[4.75rem] border-t border-border glass px-3 pt-2">
        <CaptureFxBar fx={fx} className="pb-2" />
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <button aria-label="Send media" onClick={() => toast("Pick a photo or video")} className="p-1.5 text-muted-foreground">
          <ImageIcon className="h-5 w-5" />
        </button>
        <div className="relative min-w-0">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={recording ? "Recording…" : "Message"}
            className="h-11 rounded-full border-0 bg-secondary pr-10 text-sm"
          />
          <button
            type="button"
            aria-label="Open camera"
            onClick={() => setCameraOpen(true)}
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-transform active:scale-90"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>
        {draft.trim() ? (
          <button
            onClick={send}
            aria-label="Send"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full brand-gradient transition-transform active:scale-90"
          >
            <SendHorizonal className="h-4 w-4 text-primary-foreground" />
          </button>
        ) : (
          <button
            onClick={sendVoice}
            aria-label="Record voice message"
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-full transition-transform active:scale-90",
              recording ? "brand-gradient animate-pulse" : "bg-secondary",
            )}
          >
            <Mic className="h-4 w-4" />
          </button>
        )}
        </div>
      </div>
    </div>
  );
}

/** Photo that self-destructs after the sender's view-once timer. */
function ViewOnceImage({ src, seconds }: { src: string; seconds: number }) {
  const [state, setState] = useState<"sealed" | "open" | "gone">("sealed");
  const open = () => {
    setState("open");
    window.setTimeout(() => setState("gone"), seconds * 1000);
  };
  if (state === "gone")
    return <p className="px-1 py-2 text-xs italic opacity-80">Photo expired</p>;
  if (state === "sealed")
    return (
      <button
        type="button"
        onClick={open}
        className="flex h-44 w-44 flex-col items-center justify-center gap-2 rounded-xl bg-foreground/10 text-xs font-semibold"
      >
        <EyeOff className="h-5 w-5" strokeWidth={1.7} />
        Tap to view once · {seconds}s
      </button>
    );
  return <img src={src} alt="View once photo" className="h-44 w-44 rounded-xl object-cover" />;
}