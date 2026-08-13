import React, { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  EyeOff,
  ImagePlus,
  Camera,
  Send,
  Phone,
  Video,
  Plus,
  Mic,
  Square,
  MapPin,
  Star,
  MoreVertical,
  Trash2,
  CheckCheck,
  Check,
  X,
  Pencil,
  Lock,
  Clock,
  VideoOff,
  BellOff,
  UserX,
  Flag,
} from "lucide-react";
import { toast } from "sonner";
import { orbitById, approxDistance } from "@/lib/orbit-data";
import {
  ORBIT_REQUEST_PHOTO_MAX,
  ORBIT_REQUEST_TEXT_MAX,
  countRequestMessages,
  useOrbit,
} from "@/lib/orbit-store";
import { OrbitChatGate } from "@/components/yw/OrbitChatGate";
import { OrbitCallSheet, type OrbitCallMode } from "@/components/yw/OrbitCallSheet";
import { InvitesDrawer } from "@/components/yw/InvitesDrawer";
import { PlacePickerSheet } from "@/components/yw/PlacePickerSheet";
import { buildInvite, inviteById, type InviteCard, type InviteKind } from "@/lib/orbit-invites";
import { UserWatermark } from "@/components/yw/UserWatermark";
import { useCaptureDetect } from "@/lib/capture-detect";
import { currentUser } from "@/lib/yw-data";

export const Route = createFileRoute("/orbit/chat/$userId")({
  head: () => ({
    meta: [
      { title: "Orbit Chat — YourWorld" },
      {
        name: "description",
        content:
          "A private Orbit conversation, kept separate from your main YourWorld chats.",
      },
      { property: "og:title", content: "Orbit Chat — YourWorld" },
      {
        property: "og:description",
        content: "Private one-to-one Orbit conversation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrbitChatPage,
});

type Msg = {
  id: string;
  me: boolean;
  text?: string;
  url?: string;
  audio?: string;
  invite?: InviteCard;
  system?: boolean;
};

const historyKey = (userId: string) => `yw.orbit.chat.${userId}`;

function MenuItem({
  icon,
  label,
  onClick,
  state,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  state?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
        danger ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-secondary"
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {state !== undefined && (
        <span
          className={`relative h-4 w-7 rounded-full transition-colors ${
            state ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`absolute top-0.5 h-3 w-3 rounded-full bg-background transition-all ${
              state ? "left-3.5" : "left-0.5"
            }`}
          />
        </span>
      )}
    </button>
  );
}

function loadHistory(userId: string): Msg[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(historyKey(userId));
    const parsed = raw ? (JSON.parse(raw) as Msg[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function OrbitChatPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const orbit = useOrbit();
  const p = orbitById(userId);
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const seq = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [viewOnce, setViewOnce] = useState<Record<string, number>>({});
  const [call, setCall] = useState<OrbitCallMode | null>(null);
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [inviteKind, setInviteKind] = useState<InviteKind | null>(null);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionSheetId, setActionSheetId] = useState<string | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Chat options (mirrors the Social chat 3-dot menu)
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [secretLock, setSecretLock] = useState(false);
  const [viewOnceMode, setViewOnceMode] = useState(false);
  const [autoDelete, setAutoDelete] = useState(0);
  const [screenshotAlert, setScreenshotAlert] = useState(true);
  const [recordingAlert, setRecordingAlert] = useState(true);
  const [muted, setMuted] = useState(false);
  const [reported, setReported] = useState(false);

  const request = orbit.requests[userId];
  const accepted = request?.status === "accepted" || (!request && !!orbit.connected[userId]);
  const incomingPending = request?.direction === "incoming" && request.status === "pending";
  const outgoingPending = request?.direction === "outgoing" && request.status === "pending";
  const declined = request?.status === "declined";

  const preMessages = request?.messages ?? [];
  const { texts: sentTexts, photos: sentPhotos } = countRequestMessages(request);
  const textsLeft = ORBIT_REQUEST_TEXT_MAX - sentTexts;
  const photosLeft = ORBIT_REQUEST_PHOTO_MAX - sentPhotos;

  useEffect(() => {
    if (!accepted) {
      setMsgs([]);
      return;
    }
    const history = loadHistory(userId);
    seq.current = history.length;
    setMsgs(history);
  }, [accepted, userId]);

  // Persist chat history (blob previews are session-only and are skipped).
  useEffect(() => {
    if (!accepted || typeof window === "undefined") return;
    const durable = msgs.filter(
      (m) => !m.url?.startsWith("blob:") && !m.audio?.startsWith("blob:"),
    );
    window.localStorage.setItem(historyKey(userId), JSON.stringify(durable));
  }, [msgs, accepted, userId]);

  const push = (msg: Omit<Msg, "id">) => {
    seq.current += 1;
    const id = `m${seq.current}`;
    setMsgs((m) => [...m, { id, ...msg }]);
    return id;
  };

  // Screenshot / recording detection posts an in-chat system note for both sides.
  useCaptureDetect(accepted && orbit.privacy.screenshotAlerts, (kind) => {
    push({
      me: false,
      system: true,
      text: `${currentUser.name} took a ${kind === "recording" ? "recording" : "screenshot"}`,
    });
  });

  const startRecording = async () => {
    if (!accepted) {
      toast.warning("Voice notes unlock once your Orbit request is accepted.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        push({ me: true, audio: URL.createObjectURL(blob) });
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch {
      toast.error("Microphone permission is needed for voice notes.");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  useEffect(() => () => recorderRef.current?.stop(), []);

  const startCall = (mode: OrbitCallMode) => {
    if (!accepted) {
      toast.warning("Calls unlock once your Orbit request is accepted.");
      return;
    }
    if (!orbit.privacy.callsEnabled) {
      toast.warning("Calls are turned off in your Orbit privacy settings.");
      return;
    }
    setCall(mode);
  };

  if (!p) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-sm text-muted-foreground">This Orbit chat is not available.</p>
          <Link
            to="/orbit/messages"
            className="mt-4 inline-block rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background"
          >
            Back to Orbit Messages
          </Link>
        </div>
      </main>
    );
  }

  const send = () => {
    const t = text.trim();
    if (!t) return;
    if (declined || incomingPending) return;
    if (!accepted) {
      const ok = orbit.sendRequestMessage(userId, { kind: "text", text: t });
      if (!ok) {
        toast.error(`You can send ${ORBIT_REQUEST_TEXT_MAX} texts until ${p.name} accepts`);
        return;
      }
      setText("");
      if (!outgoingPending) toast.success(`Request sent to ${p.name}`);
      return;
    }
    seq.current += 1;
    setMsgs((m) => [...m, { id: `m${seq.current}`, me: true, text: t }]);
    setText("");
  };

  const pushPhoto = (url: string, seconds = 0) => {
    if (accepted) {
      seq.current += 1;
      const id = `m${seq.current}`;
      if (seconds > 0) setViewOnce((v) => ({ ...v, [id]: seconds }));
      setMsgs((m) => [...m, { id, me: true, url }]);
      return;
    }
    const ok = orbit.sendRequestMessage(userId, { kind: "photo", url });
    if (!ok) toast.error(`You can send ${ORBIT_REQUEST_PHOTO_MAX} photos until ${p.name} accepts`);
  };

  const sendPhoto = (file: File) => pushPhoto(URL.createObjectURL(file));

  // Only messages from the local accepted-chat history are deletable.
  // Request preview messages (preMessages) are managed by the orbit store.
  const localIds = useMemo(() => new Set(msgs.map((m) => m.id)), [msgs]);
  const isDeletable = (id: string) => localIds.has(id);

  const startLongPress = (id: string) => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    longPressRef.current = setTimeout(() => setActionSheetId(id), 450);
  };
  const cancelLongPress = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    longPressRef.current = null;
  };
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const deleteIds = (ids: string[]) => {
    setMsgs((m) => m.filter((x) => !ids.includes(x.id)));
    setSelectedIds([]);
  };
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds([]);
  };
  const clearChat = () => {
    setMsgs([]);
    exitSelectMode();
    setMenuOpen(false);
    toast.success("Chat cleared");
  };

  const inputDisabled = incomingPending || declined || (!accepted && textsLeft <= 0) || selectMode;
  const photoDisabled = incomingPending || declined || (!accepted && photosLeft <= 0);
  const allMsgs: Msg[] = accepted
    ? [...preMessages.map((m) => ({ id: m.id, me: m.me, text: m.text, url: m.url })), ...msgs]
    : preMessages.map((m) => ({ id: m.id, me: m.me, text: m.text, url: m.url }));

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-2 border-b border-border glass px-3 py-2.5">
        <button
          type="button"
          onClick={() => navigate({ to: "/orbit/messages" })}
          aria-label="Back to Orbit Messages"
          className="grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
        </button>
        <Link
          to="/orbit/$profileId"
          params={{ profileId: p.id }}
          className="flex min-w-0 flex-1 items-center gap-2.5"
        >
          <img src={p.photo} alt={p.name} className="h-9 w-9 rounded-full object-cover" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{p.name}</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {p.city} · {approxDistance(p.distanceKm)}
            </span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => startCall("voice")}
            aria-label="Voice call"
            className="grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-90 disabled:opacity-40"
            disabled={!accepted}
          >
            <Phone className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => startCall("video")}
            aria-label="Video call"
            className="grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-90 disabled:opacity-40"
            disabled={!accepted}
          >
            <Video className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Chat options"
            className="grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-90"
          >
            <MoreVertical className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </button>
        </div>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-[70]" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-3 top-14 z-[80] w-56 rounded-2xl border border-border bg-popover/95 p-2 shadow-2xl backdrop-blur-md">
              <button
                type="button"
                onClick={clearChat}
                disabled={allMsgs.length === 0}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.8} /> Clear Chat
              </button>
              <button
                type="button"
                onClick={() => {
                  exitSelectMode();
                  setSelectMode(true);
                  setMenuOpen(false);
                  toast.info("Tap messages to select multiple for deletion");
                }}
                disabled={allMsgs.length === 0}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
              >
                <CheckCheck className="h-4 w-4" strokeWidth={1.8} /> Select Multiple
              </button>
            </div>
          </>
        )}
      </header>

      {selectMode && (
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-secondary/60 px-4 py-2">
          <button
            type="button"
            onClick={exitSelectMode}
            className="text-xs font-semibold text-muted-foreground"
          >
            Cancel
          </button>
          <span className="text-xs font-bold text-foreground">
            {selectedIds.length} selected
          </span>
          <button
            type="button"
            onClick={() => {
              deleteIds(selectedIds);
              setSelectMode(false);
            }}
            disabled={selectedIds.length === 0}
            className={`flex items-center gap-1 text-xs font-bold transition-colors ${
              selectedIds.length ? "text-destructive" : "text-muted-foreground/50"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} /> Delete
          </button>
        </div>
      )}

      <section className="relative flex-1 space-y-2 overflow-y-auto px-4 py-4">
        <UserWatermark username={currentUser.username} className="fixed" />
        <OrbitChatGate
          profileId={p.id}
          name={p.name}
          request={request}
          onAccept={() => {
            orbit.acceptRequest(userId);
            toast.success(`You're now connected with ${p.name}`);
          }}
          onDecline={() => {
            orbit.declineRequest(userId);
            toast.success("Request declined");
          }}
        />
        {allMsgs.length === 0 ? (
          <p className="pt-10 text-center text-xs text-muted-foreground">
            {accepted
              ? `Say hello to ${p.name} — messages here stay inside Orbit.`
              : `Send up to ${ORBIT_REQUEST_TEXT_MAX} texts and ${ORBIT_REQUEST_PHOTO_MAX} photos to request a chat with ${p.name}.`}
          </p>
        ) : (
          allMsgs.map((m) => {
            if (m.system) {
              return (
                <p
                  key={m.id}
                  className="mx-auto w-fit rounded-full bg-secondary/70 px-3 py-1 text-center text-[11px] text-muted-foreground"
                >
                  {m.text}
                </p>
              );
            }
            const deletable = isDeletable(m.id);
            const selected = selectedIds.includes(m.id);
            const handlers = deletable
              ? {
                  onPointerDown: () => !selectMode && startLongPress(m.id),
                  onPointerUp: cancelLongPress,
                  onPointerLeave: cancelLongPress,
                  onContextMenu: (e: React.MouseEvent) => {
                    e.preventDefault();
                    if (!selectMode) setActionSheetId(m.id);
                  },
                  onClick: () => selectMode && toggleSelect(m.id),
                }
              : {};
            return (
              <div
                key={m.id}
                {...handlers}
                className={`flex flex-col ${m.me ? "items-end" : "items-start"} ${
                  selectMode && selected ? "rounded-2xl bg-primary/10 ring-1 ring-primary/40" : ""
                } ${selectMode && deletable ? "cursor-pointer select-none px-1 py-1" : ""}`}
              >
                {selectMode && deletable && (
                  <span
                    className={`mb-1 flex h-4 w-4 items-center justify-center rounded-full border ${
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                    }`}
                  >
                    {selected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                  </span>
                )}
                <div
                  className={`max-w-[75%] overflow-hidden rounded-2xl text-sm ${
                    m.url || m.invite ? "" : "px-3.5 py-2"
                  } ${
                    m.me
                      ? "bg-primary text-primary-foreground"
                      : "chip text-foreground"
                  }`}
                >
                  {m.invite ? (
                    <InviteBubble invite={m.invite} />
                  ) : m.audio ? (
                    <audio src={m.audio} controls className="h-9 w-56 max-w-full" />
                  ) : m.url ? (
                    viewOnce[m.id] ? (
                      <OrbitViewOnce src={m.url} seconds={viewOnce[m.id]} />
                    ) : (
                      <img src={m.url} alt="Shared photo" className="h-40 w-full object-cover" />
                    )
                  ) : (
                    m.text
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="shrink-0 border-t border-border glass px-3 py-3"
      >
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) sendPhoto(f);
              e.target.value = "";
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) sendPhoto(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={photoDisabled}
            aria-label="Send photo"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary transition-transform active:scale-90 disabled:opacity-50"
          >
            <ImagePlus className="h-4 w-4" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!accepted) {
                toast.warning("Invites unlock once your Orbit request is accepted.");
                return;
              }
              setInvitesOpen(true);
            }}
            disabled={incomingPending || declined}
            aria-label="Open invites"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary transition-transform active:scale-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => (recording ? stopRecording() : void startRecording())}
            disabled={incomingPending || declined}
            aria-label={recording ? "Stop voice note" : "Record voice note"}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-transform active:scale-90 disabled:opacity-50 ${
              recording ? "bg-destructive text-destructive-foreground" : "bg-secondary"
            }`}
          >
            {recording ? (
              <Square className="h-3.5 w-3.5" strokeWidth={2.2} />
            ) : (
              <Mic className="h-4 w-4" strokeWidth={1.8} />
            )}
          </button>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={photoDisabled}
            aria-label="Open camera"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary transition-transform active:scale-90 disabled:opacity-50"
          >
            <Camera className="h-4 w-4" strokeWidth={1.8} />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={inputDisabled}
            placeholder={
              incomingPending || declined
                ? "Waiting for the request to be accepted"
                : !accepted && textsLeft <= 0
                  ? "Text limit reached until accepted"
                : accepted
                  ? `Message ${p.name}`
                  : `${textsLeft} of ${ORBIT_REQUEST_TEXT_MAX} texts left`
            }
            aria-label={`Message ${p.name}`}
            className="min-w-0 flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={inputDisabled}
            aria-label="Send message"
            className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
      </form>

      <OrbitCallSheet
        mode={call}
        peerName={p.name}
        peerPhoto={p.photo}
        onClose={() => setCall(null)}
      />

      <InvitesDrawer
        open={invitesOpen}
        onOpenChange={setInvitesOpen}
        onPick={(kind) => setInviteKind(kind)}
      />
      <PlacePickerSheet
        open={inviteKind !== null}
        kind={inviteKind}
        region={p.city}
        onOpenChange={(o) => !o && setInviteKind(null)}
        onSelect={(place) => {
          if (!inviteKind) return;
          push({ me: true, invite: buildInvite(inviteKind, place) });
          setInviteKind(null);
          toast.success(`Invite sent to ${p.name}`, { description: place.name });
        }}
      />

      {actionSheetId !== null && (
        <div
          className="fixed inset-0 z-[90] flex items-end bg-black/60 backdrop-blur-sm"
          onClick={() => setActionSheetId(null)}
        >
          <div
            className="w-full rounded-t-3xl border-t border-border bg-popover p-3 pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/40" />
            <button
              type="button"
              onClick={() => {
                deleteIds([actionSheetId]);
                setActionSheetId(null);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.8} /> Delete Message
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectMode(true);
                setSelectedIds([actionSheetId]);
                setActionSheetId(null);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              <CheckCheck className="h-4 w-4" strokeWidth={1.8} /> Select Multiple
            </button>
            <button
              type="button"
              onClick={() => setActionSheetId(null)}
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary"
            >
              <X className="h-4 w-4" strokeWidth={1.8} /> Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function InviteBubble({ invite }: { invite: InviteCard }) {
  const Icon = inviteById(invite.kind).icon;
  return (
    <div className="w-64 max-w-full space-y-1 p-3.5">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] opacity-80">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.9} /> {invite.title}
      </p>
      <p className="pt-1 text-sm font-semibold">{invite.place}</p>
      <p className="flex items-start gap-1.5 text-xs opacity-85">
        <MapPin className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.8} />
        {invite.address}
      </p>
      <p className="flex items-center gap-2 text-[11px] opacity-80">
        {typeof invite.rating === "number" && (
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3" strokeWidth={1.8} /> {invite.rating.toFixed(1)}
          </span>
        )}
        {typeof invite.open === "boolean" && <span>{invite.open ? "Open now" : "Closed now"}</span>}
      </p>
      {invite.mapsUrl && (
        <a
          href={invite.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block rounded-full bg-background/20 py-2 text-center text-[11px] font-semibold underline-offset-2"
        >
          Open in Maps
        </a>
      )}
    </div>
  );
}

function OrbitViewOnce({ src, seconds }: { src: string; seconds: number }) {
  const [state, setState] = useState<"sealed" | "open" | "gone">("sealed");
  if (state === "gone")
    return <p className="px-3.5 py-2 text-xs italic opacity-80">Photo expired</p>;
  if (state === "sealed")
    return (
      <button
        type="button"
        onClick={() => {
          setState("open");
          window.setTimeout(() => setState("gone"), seconds * 1000);
        }}
        className="flex h-40 w-full flex-col items-center justify-center gap-2 bg-foreground/10 text-xs font-semibold"
      >
        <EyeOff className="h-5 w-5" strokeWidth={1.7} />
        Tap to view once · {seconds}s
      </button>
    );
  return <img src={src} alt="View once photo" className="h-40 w-full object-cover" />;
}
