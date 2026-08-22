import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  Heart,
  MessageCircle,
  Handshake,
  Sparkles,
  MapPin,
  BadgeCheck,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { approxDistance } from "@/lib/orbit-data";
import { useOrbitProfile } from "@/lib/orbit-live";
import { useOrbit } from "@/lib/orbit-store";
import { moodById } from "@/lib/orbit-mood";
import { OrbitCallActions } from "@/components/yw/OrbitCallActions";

export const Route = createFileRoute("/orbit/$profileId")({
  head: () => ({
    meta: [
      { title: "Orbit Profile — YourWorld" },
      {
        name: "description",
        content:
          "View a full Orbit profile: hobbies, about and approximate area only — never an exact location.",
      },
      { property: "og:title", content: "Orbit Profile — YourWorld" },
      {
        property: "og:description",
        content: "Full Orbit profile with privacy-first, approximate location only.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrbitProfilePage,
});

function OrbitProfilePage() {
  const { profileId } = Route.useParams();
  const navigate = useNavigate();
  const orbit = useOrbit();
  const { profile: p } = useOrbitProfile(profileId);

  if (!p) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-sm text-muted-foreground">This Orbit profile is not available.</p>
          <Link
            to="/orbit"
            className="mt-4 inline-block rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background"
          >
            Back to Orbit
          </Link>
        </div>
      </main>
    );
  }

  const mood = moodById(p.mood);
  const gate = (action: () => void) => () => {
    if (!orbit.hasProfile) {
      toast.warning("Create an Orbit Profile to use this.");
      return;
    }
    action();
  };

  return (
    <main className="min-h-screen pb-16">
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-border glass px-3 py-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/orbit" })}
          aria-label="Back to Orbit feed"
          className="grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
        </button>
        <h1 className="font-display text-lg font-bold">{p.name}</h1>
      </header>

      <div className="relative aspect-[4/5] w-full overflow-hidden">
        {p.photo ? (
          <img src={p.photo} alt={`${p.name}, ${p.headline}`} className="h-full w-full object-cover" />
        ) : (
          <div
            className="grid h-full w-full place-items-center font-display text-7xl font-bold text-foreground"
            style={{ backgroundImage: `linear-gradient(140deg, oklch(0.5 0.18 ${p.hue}), oklch(0.28 0.1 ${p.hue + 40}))` }}
            aria-hidden
          >
            {p.name.charAt(0)}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,oklch(0.12_0.02_290/0.92),transparent)] p-5 pt-20">
          <div className="flex items-center gap-1.5">
            <h2 className="font-display text-2xl font-bold">
              {p.name}, {p.age}
            </h2>
            {p.verified && (
              <BadgeCheck
                className="h-5 w-5 fill-[oklch(0.62_0.17_255)] text-background"
                strokeWidth={1.8}
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground">{p.headline}</p>
          {mood && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-background/60 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
              <span aria-hidden>{mood.emoji}</span>
              {mood.label}
            </span>
          )}
          <p className="flex items-center gap-1 pt-1.5 text-xs text-muted-foreground/90">
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.8} />
            {p.area} · {approxDistance(p.distanceKm)}
          </p>
        </div>
      </div>

      <section className="px-5 pt-5">
        <p className="text-sm leading-relaxed text-muted-foreground">{p.about}</p>
        <div className="flex flex-wrap gap-1.5 pt-4">
          {p.interests.map((t) => (
            <span key={t} className="chip rounded-full px-3 py-1 text-[11px] font-medium">
              {t}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2 pt-6">
          <Action
            icon={Heart}
            label="Like"
            active={!!orbit.liked[p.id]}
            locked={!orbit.hasProfile}
            onClick={gate(() => {
              orbit.toggleLike(p.id);
              toast.success(orbit.liked[p.id] ? "Like removed" : `You liked ${p.name}`);
            })}
          />
          <Action
            icon={MessageCircle}
            label="Message"
            locked={!orbit.hasProfile}
            onClick={gate(() => navigate({ to: "/orbit/chat/$userId", params: { userId: p.id } }))}
          />
          <Action
            icon={Handshake}
            label="Connect"
            active={!!orbit.connected[p.id]}
            locked={!orbit.hasProfile}
            onClick={gate(() => {
              orbit.toggleConnect(p.id);
              toast.success(
                orbit.connected[p.id] ? "Connection withdrawn" : "Connection request sent",
              );
            })}
          />
          <Action
            icon={Sparkles}
            label="Match"
            locked={!orbit.hasProfile}
            onClick={gate(() => toast.success(`Match request sent to ${p.name}`))}
          />
        </div>

        <OrbitCallActions profile={p} />

        <p className="pt-5 text-[11px] leading-relaxed text-muted-foreground">
          Only approximate areas are ever shown — never an exact location.
        </p>
      </section>
    </main>
  );
}

function Action({
  icon: Icon,
  label,
  onClick,
  active,
  locked,
}: {
  icon: typeof Heart;
  label: string;
  onClick: () => void;
  active?: boolean;
  locked?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={locked ? `${label} — locked` : label}
      className={`relative flex flex-col items-center gap-1 rounded-2xl py-2.5 transition-all active:scale-95 ${
        active ? "bg-foreground text-background" : "chip text-muted-foreground"
      }`}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
      <span className="text-[10px] font-medium">{label}</span>
      {locked && (
        <Lock className="absolute right-2 top-2 h-3 w-3 text-muted-foreground/70" strokeWidth={2} />
      )}
    </button>
  );
}