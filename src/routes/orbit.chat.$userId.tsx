import { useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Send } from "lucide-react";
import { orbitById, approxDistance } from "@/lib/orbit-data";

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
  const p = orbitById(userId);
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const seq = useRef(0);

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
    seq.current += 1;
    setMsgs((m) => [...m, { id: `m${seq.current}`, me: true, text: t }]);
    setText("");
  };

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
        {msgs.length === 0 ? (
          <p className="pt-10 text-center text-xs text-muted-foreground">
            Say hello to {p.name} — messages here stay inside Orbit.
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
          placeholder={`Message ${p.name}`}
          aria-label={`Message ${p.name}`}
          className="min-w-0 flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm outline-none"
        />
        <button
          type="submit"
          aria-label="Send message"
          className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-90"
        >
          <Send className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </form>
    </main>
  );
}