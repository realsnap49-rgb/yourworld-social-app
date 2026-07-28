import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  Heart,
  MessageCircle,
  Handshake,
  Sparkles,
  MapPin,
  BadgeCheck,
  Lock,
  ShieldCheck,
  Settings2,
  EyeOff,
  Flag,
  Ban,
  ScanFace,
  AlertTriangle,
  CalendarHeart,
  Navigation,
} from "lucide-react";
import { toast } from "sonner";
import { orbitProfiles, approxDistance, type OrbitProfile } from "@/lib/orbit-data";
import { useOrbit, useScreenCaptureShield } from "@/lib/orbit-store";
import { analyzeProfile } from "@/lib/orbit-trust";
import { useLiveLocation, remainingLabel } from "@/lib/live-location";
import { MeetupSheet } from "@/components/yw/MeetupSheet";
import { LiveLocationSheet } from "@/components/yw/LiveLocationSheet";
import { OrbitLockedSheet } from "@/components/yw/OrbitLockedSheet";

export const Route = createFileRoute("/orbit/")({
  head: () => ({
    meta: [
      { title: "Orbit — Private social discovery on YourWorld" },
      {
        name: "description",
        content:
          "Browse Orbit profiles anonymously. Create an Orbit Profile to like, message, connect and match — with approximate location only.",
      },
      { property: "og:title", content: "Orbit — Private social discovery on YourWorld" },
      {
        property: "og:description",
        content: "Privacy-first discovery: browse freely, unlock Orbit features when you're ready.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrbitBrowse,
});

function OrbitBrowse() {
  const orbit = useOrbit();
  const [locked, setLocked] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [meetupFor, setMeetupFor] = useState<OrbitProfile | null>(null);
  const [liveFor, setLiveFor] = useState<OrbitProfile | null>(null);
  const live = useLiveLocation();
  const obscured = useScreenCaptureShield(orbit.privacy.screenshotProtection);

  const visible = useMemo(
    () =>
      orbitProfiles.filter(
        (p) =>
          !orbit.privacy.blocked.includes(p.id) &&
          !orbit.privacy.hiddenFrom.includes(p.id) &&
          !(
            orbit.privacy.aiFakeDetection &&
            orbit.privacy.hideFlaggedProfiles &&
            analyzeProfile(p).level === "flagged"
          ),
      ),
    [
      orbit.privacy.blocked,
      orbit.privacy.hiddenFrom,
      orbit.privacy.aiFakeDetection,
      orbit.privacy.hideFlaggedProfiles,
    ],
  );

  const gate = (action: () => void) => () => {
    if (!orbit.hasProfile) {
      setLocked(true);
      return;
    }
    action();
  };

  return (
    <main className="min-h-screen pb-12">
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-border glass px-3 py-3">
        <Link
          to="/settings"
          aria-label="Back to settings"
          className="grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
        </Link>
        <h1 className="font-display text-lg font-bold">Orbit</h1>
        <Link
          to="/orbit/privacy"
          aria-label="Orbit privacy & safety"
          className="ml-auto grid h-9 w-9 place-items-center rounded-full chip transition-transform active:scale-90"
        >
          <Settings2 className="h-[18px] w-[18px]" strokeWidth={1.6} />
        </Link>
      </header>

      <div className="px-4 pt-4">
        <div className="surface-card flex items-start gap-3 rounded-3xl p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-secondary">
            {orbit.hasProfile ? (
              <ShieldCheck className="h-5 w-5" strokeWidth={1.7} />
            ) : (
              <Lock className="h-[18px] w-[18px]" strokeWidth={1.7} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {orbit.hasProfile
                ? orbit.privacy.paused
                  ? "Orbit Profile paused"
                  : "Orbit Profile active"
                : "Browsing anonymously"}
            </p>
            <p className="pt-0.5 text-xs leading-relaxed text-muted-foreground">
              {orbit.hasProfile
                ? "Only approximate areas are ever shown — never your exact location."
                : "Look around freely. Liking, messaging, connecting and matching need an Orbit Profile."}
            </p>
          </div>
          {!orbit.hasProfile && (
            <Link
              to="/orbit/create"
              className="shrink-0 rounded-full bg-foreground px-3.5 py-2 text-xs font-semibold text-background transition-transform active:scale-95"
            >
              Create
            </Link>
          )}
        </div>
      </div>

      <div className={`space-y-4 px-4 pt-4 ${obscured ? "pointer-events-none blur-xl" : ""}`}>
        {visible.map((p, i) => (
          <article
            key={p.id}
            className="surface-card animate-rise overflow-hidden rounded-[28px]"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden">
              <img
                src={p.photo}
                alt={`${p.name}, ${p.headline}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,oklch(0.12_0.02_290/0.92),transparent)] p-4 pt-16">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-display text-lg font-bold">
                    {p.name}, {p.age}
                  </h2>
                  {p.verified && (
                    <BadgeCheck
                      className="h-4 w-4 fill-[oklch(0.62_0.17_255)] text-background"
                      strokeWidth={1.8}
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{p.headline}</p>
                <p className="flex items-center gap-1 pt-1 text-[11px] text-muted-foreground/90">
                  <MapPin className="h-3 w-3" strokeWidth={1.8} />
                  {p.area} · {approxDistance(p.distanceKm)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMenuFor(menuFor === p.id ? null : p.id)}
                aria-label={`Safety options for ${p.name}`}
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-background/60 backdrop-blur transition-transform active:scale-90"
              >
                <Flag className="h-[15px] w-[15px]" strokeWidth={1.7} />
              </button>
            </div>

            <div className="p-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{p.about}</p>
              <div className="flex flex-wrap gap-1.5 pt-3">
                {p.interests.map((t) => (
                  <span key={t} className="chip rounded-full px-3 py-1 text-[11px] font-medium">
                    {t}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-2 pt-4">
                <OrbitAction
                  icon={Heart}
                  label="Like"
                  active={!!orbit.liked[p.id]}
                  locked={!orbit.hasProfile}
                  onClick={gate(() => {
                    orbit.toggleLike(p.id);
                    toast.success(orbit.liked[p.id] ? "Like removed" : `You liked ${p.name}`);
                  })}
                />
                <OrbitAction
                  icon={MessageCircle}
                  label="Message"
                  locked={!orbit.hasProfile}
                  onClick={gate(() => toast.success(`Orbit chat opened with ${p.name}`))}
                />
                <OrbitAction
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
                <OrbitAction
                  icon={Sparkles}
                  label="Match"
                  locked={!orbit.hasProfile}
                  onClick={gate(() => toast.success(`Match request sent to ${p.name}`))}
                />
              </div>
            </div>

            {menuFor === p.id && <SafetyMenu profile={p} onClose={() => setMenuFor(null)} />}
          </article>
        ))}

        {visible.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No Orbit profiles to show. Check your hidden and blocked lists.
          </p>
        )}
      </div>

      {obscured && (
        <p className="fixed inset-x-0 bottom-6 z-50 px-6 text-center text-xs text-muted-foreground">
          Orbit content hidden while the app is in the background.
        </p>
      )}

      <OrbitLockedSheet open={locked} onOpenChange={setLocked} />
    </main>
  );
}

function OrbitAction({
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
        <Lock
          className="absolute right-2 top-2 h-3 w-3 text-muted-foreground/70"
          strokeWidth={2}
        />
      )}
    </button>
  );
}

function SafetyMenu({ profile, onClose }: { profile: OrbitProfile; onClose: () => void }) {
  const orbit = useOrbit();
  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default"
      />
      <div className="absolute right-4 top-14 z-50 w-56 overflow-hidden rounded-2xl border border-border/60 glass">
        <MenuRow
          icon={EyeOff}
          label="Hide me from this user"
          onClick={() => {
            orbit.toggleHiddenFrom(profile.id);
            toast.success(`You are now hidden from ${profile.name}`);
            onClose();
          }}
        />
        <MenuRow
          icon={Ban}
          label="Block user"
          onClick={() => {
            orbit.toggleBlocked(profile.id);
            toast.success(`${profile.name} blocked`);
            onClose();
          }}
        />
        <MenuRow
          icon={Flag}
          label="Report user"
          danger
          onClick={() => {
            toast.success("Report sent to the Orbit safety team");
            onClose();
          }}
        />
      </div>
    </>
  );
}

function MenuRow({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Flag;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 border-b border-border/60 px-3.5 py-3 text-left text-sm last:border-0 transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_7%,transparent)] ${
        danger ? "text-destructive" : ""
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.7} />
      {label}
    </button>
  );
}