import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft, Send, X } from "lucide-react";
import { toast } from "sonner";
import { orbitById, approxDistance } from "@/lib/orbit-data";
import { useOrbit } from "@/lib/orbit-store";

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

type Msg = { id: string; me: boolean; text: string };

function OrbitChatPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const orbit = useOrbit();
  const p = orbitById(userId);
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const seq = useRef(0);

  const request = orbit.requests[userId];
  const accepted = request?.status === "accepted" || (!request && !!orbit.connected[userId]);
  const incomingPending = request?.direction === "incoming" && request.status === "pending";
  const outgoingPending = request?.direction === "outgoing" && request.status === "pending";
  const declined = request?.status === "declined";

  useEffect(() => {
    if (request?.intro) {
      setMsgs([{ id: "intro", me: request.direction === "outgoing", text: request.intro }]);
    }
  }, [request?.intro, request?.direction]);

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
      // Sender may send exactly one text-only message until the request is accepted.
      if (outgoingPending) return;
      orbit.sendChatRequest(userId, t);
      setText("");
      toast.success(`Request sent to ${p.name}`);
      return;
    }
    seq.current += 1;
    setMsgs((m) => [...m, { id: `m${seq.current}`, me: true, text: t }]);
    setText("");
  };

  const inputDisabled = outgoingPending || incomingPending || declined;

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
        {incomingPending && (
          <div className="mb-3 rounded-2xl border border-border p-4 text-center">
            <p className="text-sm font-semibold">{p.name} wants to chat</p>
            <p className="pt-1 text-xs text-muted-foreground">
              Accept to start chatting. They can only send one message until you do.
            </p>
            <div className="flex items-center justify-center gap-2 pt-3">
              <button
                type="button"
                onClick={() => {
                  orbit.acceptRequest(userId);
                  toast.success(`You're now connected with ${p.name}`);
                }}
                className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-transform active:scale-95"
              >
                <Check className="h-4 w-4" strokeWidth={2} />
                Accept
              </button>
              <button
                type="button"
                onClick={() => {
                  orbit.declineRequest(userId);
                  toast.success("Request declined");
                }}
                className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold transition-transform active:scale-95"
              >
                <X className="h-4 w-4" strokeWidth={2} />
                Decline
              </button>
            </div>
            <Link
              to="/orbit/$profileId"
              params={{ profileId: p.id }}
              className="mt-3 inline-block text-[11px] font-semibold underline underline-offset-4"
            >
              View Full Profile
            </Link>
          </div>
        )}
        {outgoingPending && (
          <p className="mb-2 rounded-2xl border border-border px-4 py-3 text-center text-[11px] text-muted-foreground">
            Request sent — you can send one more message once {p.name} accepts.
          </p>
        )}
        {declined && (
          <p className="mb-2 rounded-2xl border border-border px-4 py-3 text-center text-[11px] text-muted-foreground">
            This request was declined.
          </p>
        )}
        {msgs.length === 0 ? (
          <p className="pt-10 text-center text-xs text-muted-foreground">
            {accepted
              ? `Say hello to ${p.name} — messages here stay inside Orbit.`
              : `Send one text message to request a chat with ${p.name}.`}
          </p>
        ) : (
          msgs.map((m) => (
            <div
              key={m.id}
              className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                m.me
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "chip text-foreground"
              }`}
            >
              {m.text}
            </div>
          ))
        )}
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="sticky bottom-0 flex items-center gap-2 border-t border-border glass px-3 py-3"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={inputDisabled}
          placeholder={
            inputDisabled
              ? "Waiting for the request to be accepted"
              : accepted
                ? `Message ${p.name}`
                : `Send one message to ${p.name}`
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
      </form>
    </main>
  );
}