import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, EyeOff, ImagePlus, Camera, Send } from "lucide-react";
import { toast } from "sonner";
import { orbitById, approxDistance } from "@/lib/orbit-data";
import {
  ORBIT_REQUEST_PHOTO_MAX,
  ORBIT_REQUEST_TEXT_MAX,
  countRequestMessages,
  useOrbit,
} from "@/lib/orbit-store";
import { OrbitChatGate } from "@/components/yw/OrbitChatGate";
import { QuickCaptureSheet } from "@/components/yw/QuickCaptureSheet";
import { CaptureFxBar, useCaptureFx } from "@/lib/capture-fx";

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

type Msg = { id: string; me: boolean; text?: string; url?: string };

function OrbitChatPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const orbit = useOrbit();
  const p = orbitById(userId);
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const seq = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const fx = useCaptureFx();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [viewOnce, setViewOnce] = useState<Record<string, number>>({});

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
    if (!accepted) setMsgs([]);
  }, [accepted]);

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

  const inputDisabled = incomingPending || declined || (!accepted && textsLeft <= 0);
  const photoDisabled = incomingPending || declined || (!accepted && photosLeft <= 0);
  const allMsgs: Msg[] = accepted
    ? [...preMessages.map((m) => ({ id: m.id, me: m.me, text: m.text, url: m.url })), ...msgs]
    : preMessages.map((m) => ({ id: m.id, me: m.me, text: m.text, url: m.url }));

  return (
    <main className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-border glass px-3 py-2.5">
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
      </header>

      <section className="flex-1 space-y-2 px-4 py-4">
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
          allMsgs.map((m) => (
            <div
              key={m.id}
              className={`max-w-[75%] overflow-hidden rounded-2xl text-sm ${
                m.url ? "" : "px-3.5 py-2"
              } ${
                m.me
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "chip text-foreground"
              }`}
            >
              {m.url ? (
                viewOnce[m.id] ? (
                  <OrbitViewOnce src={m.url} seconds={viewOnce[m.id]} />
                ) : (
                  <img src={m.url} alt="Shared photo" className="h-40 w-full object-cover" />
                )
              ) : (
                m.text
              )}
            </div>
          ))
        )}
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="sticky bottom-0 border-t border-border glass px-3 py-3"
      >
        <CaptureFxBar fx={fx} className="pb-2" />
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
            onClick={() => setCameraOpen(true)}
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

      <QuickCaptureSheet
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        fx={fx}
        onCapture={({ url, viewOnce: secs }) => {
          pushPhoto(url, secs ?? undefined);
          toast.success((secs ?? 0) > 0 ? `Sent as view once · ${secs}s` : "Photo sent");
        }}
      />
    </main>
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
