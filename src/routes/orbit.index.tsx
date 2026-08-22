import { useMemo, useState } from "react";
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
  ShieldCheck,
  Settings2,
  UserRound,
  EyeOff,
  Flag,
  Ban,
  ScanFace,
  AlertTriangle,
  CalendarHeart,
  Navigation,
  Bell,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { approxDistance, type OrbitProfile } from "@/lib/orbit-data";
import { useOrbitProfiles } from "@/lib/orbit-live";
import { useOrbit, useScreenCaptureShield } from "@/lib/orbit-store";
import { sendOrbitMatch, useOrbitMatches } from "@/lib/orbit-match";
import { useNotifications } from "@/lib/notifications-store";
import { analyzeProfile } from "@/lib/orbit-trust";
import { moodById, moodMatchScore } from "@/lib/orbit-mood";
import { useLiveLocation, remainingLabel } from "@/lib/live-location";
import { MeetupSheet } from "@/components/yw/MeetupSheet";
import { LiveLocationSheet } from "@/components/yw/LiveLocationSheet";
import { OrbitLockedSheet } from "@/components/yw/OrbitLockedSheet";
import {
  OrbitFilterBar,
  OrbitFiltersSheet,
  emptyOrbitFilters,
  matchesOrbitFilters,
  type OrbitFilterState,
} from "@/components/yw/OrbitFilters";

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
  const { unreadOrbit: orbitUnread } = useNotifications();
  const [locked, setLocked] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [meetupFor, setMeetupFor] = useState<OrbitProfile | null>(null);
  const [liveFor, setLiveFor] = useState<OrbitProfile | null>(null);
  const [filters, setFilters] = useState<OrbitFilterState>(emptyOrbitFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const live = useLiveLocation();
  const obscured = useScreenCaptureShield(orbit.privacy.screenshotProtection);
  const { profiles: orbitProfiles } = useOrbitProfiles();
  const navigate = useNavigate();
  const { mutual, likedByMe, refresh: refreshMatches } = useOrbitMatches();

  const onMatch = async (id: string, name: string) => {
    const next = !likedByMe.includes(id);
    const res = await sendOrbitMatch(id, next);
    refreshMatches();
    if (!res.ok) {
      toast.error("Couldn't send that match — try again.");
      return;
    }
    if (!next) toast.success("Match withdrawn");
    else if (res.mutual) toast.success(`It's a match with ${name}! Chat unlocked.`);
    else toast.success(`Match sent to ${name}`);
  };

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
      orbitProfiles,
      orbit.privacy.blocked,
      orbit.privacy.hiddenFrom,
      orbit.privacy.aiFakeDetection,
      orbit.privacy.hideFlaggedProfiles,
    ],
  );

  const myMood = orbit.profile?.mood ?? null;
  const myInterests = orbit.profile?.hobbies ?? [];

  /** Same-mood and similar-interest people are surfaced first. */
  const ranked = useMemo(
    () =>
      visible
        .filter((p) => matchesOrbitFilters(p, filters))
        .sort(
        (a, b) =>
          moodMatchScore(b, myMood, myInterests) - moodMatchScore(a, myMood, myInterests),
      ),
    [visible, myMood, myInterests, filters],
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
      <header className="sticky top-0 z-40 flex items-center gap-1.5 border-b border-border glass px-3 py-2.5">
        <Link
          to="/settings"
          aria-label="Back to settings"
          className="grid h-8 w-8 place-items-center rounded-full transition-transform active:scale-90"
        >
          <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </Link>
        <h1 className="font-display text-base font-bold">Orbit</h1>
        <button
          type="button"
          onClick={() => setSearchOpen((v) => !v)}
          aria-label={searchOpen ? "Close search" : "Open search"}
          aria-pressed={searchOpen}
          className="grid h-8 w-8 place-items-center rounded-full chip transition-transform active:scale-90"
        >
          <Search className="h-[15px] w-[15px]" strokeWidth={1.7} />
        </button>
        <Link
          to="/orbit/notifications"
          aria-label={
            orbitUnread > 0 ? `Orbit notifications, ${orbitUnread} unread` : "Orbit notifications"
          }
          className="relative ml-auto grid h-8 w-8 place-items-center rounded-full chip transition-transform active:scale-90"
        >
          <Bell className="h-[15px] w-[15px]" strokeWidth={1.6} />
          {orbitUnread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-[14px] min-w-[14px] place-items-center rounded-full bg-primary px-1 text-[8px] font-bold leading-none text-primary-foreground ring-2 ring-background">
              {orbitUnread > 99 ? "99+" : orbitUnread}
            </span>
          )}
        </Link>
        <Link
          to="/orbit/messages"
          aria-label="Orbit messages"
          className="grid h-8 w-8 place-items-center rounded-full chip transition-transform active:scale-90"
        >
          <MessageCircle className="h-[15px] w-[15px]" strokeWidth={1.6} />
        </Link>
        <Link
          to="/orbit/me"
          aria-label="My Orbit profile"
          className="grid h-8 w-8 place-items-center rounded-full chip transition-transform active:scale-90"
        >
          <UserRound className="h-[15px] w-[15px]" strokeWidth={1.6} />
        </Link>
        <Link
          to="/orbit/privacy"
          aria-label="Orbit privacy & safety"
          className="grid h-8 w-8 place-items-center rounded-full chip transition-transform active:scale-90"
        >
          <Settings2 className="h-[15px] w-[15px]" strokeWidth={1.6} />
        </Link>
      </header>

      {!orbit.hasProfile && (
        <div className="px-4 pt-4">
          <div className="surface-card flex items-start gap-3 rounded-3xl p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-secondary">
              <ShieldCheck className="h-5 w-5" strokeWidth={1.7} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Create your Orbit ID</p>
              <p className="pt-0.5 text-xs leading-relaxed text-muted-foreground">
                Browse freely — an Orbit ID unlocks likes, messages and matches. Only approximate
                areas are ever shown.
              </p>
              <Link
                to="/orbit/create"
                className="mt-3 inline-flex rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition-transform active:scale-95"
              >
                Create Orbit ID
              </Link>
            </div>
          </div>
        </div>
      )}

      {searchOpen && (
        <OrbitFilterBar
          filters={filters}
          onChange={setFilters}
          onOpen={() => setFiltersOpen(true)}
          resultCount={ranked.length}
        />
      )}

      <div
        className={`no-scrollbar flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden px-4 pt-4 ${
          obscured ? "pointer-events-none blur-xl" : ""
        }`}
      >
        {ranked.map((p, i) => (
          <article
            key={p.id}
            className="surface-card animate-rise relative w-full max-w-md shrink-0 snap-center overflow-hidden rounded-[28px]"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <Link
              to="/orbit/$profileId"
              params={{ profileId: p.id }}
              aria-label={`Open ${p.name}'s Orbit profile`}
              className="relative block aspect-[4/5] w-full overflow-hidden"
            >
              {p.photo ? (
                <img
                  src={p.photo}
                  alt={`${p.name}, ${p.headline}`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="grid h-full w-full place-items-center font-display text-6xl font-bold text-foreground"
                  style={{ backgroundImage: `linear-gradient(140deg, oklch(0.5 0.18 ${p.hue}), oklch(0.28 0.1 ${p.hue + 40}))` }}
                  aria-hidden
                >
                  {p.name.charAt(0)}
                </div>
              )}
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
                {moodById(p.mood) && (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5 text-[10px] font-medium backdrop-blur">
                    <span aria-hidden>{moodById(p.mood)!.emoji}</span>
                    {moodById(p.mood)!.label}
                    {myMood && p.mood === myMood && (
                      <span className="text-muted-foreground">· same as you</span>
                    )}
                  </span>
                )}
                <p className="flex items-center gap-1 pt-1 text-[11px] text-muted-foreground/90">
                  <MapPin className="h-3 w-3" strokeWidth={1.8} />
                  {p.area} · {approxDistance(p.distanceKm)}
                </p>
              </div>
            </Link>
            <button
                type="button"
                onClick={() => setMenuFor(menuFor === p.id ? null : p.id)}
                aria-label={`Safety options for ${p.name}`}
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-background/60 backdrop-blur transition-transform active:scale-90"
              >
                <Flag className="h-[15px] w-[15px]" strokeWidth={1.7} />
              </button>

            <div className="p-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{p.about}</p>
              {orbit.privacy.aiFakeDetection && <TrustChip profile={p} />}
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
                  onClick={gate(() =>
                    navigate({ to: "/orbit/chat/$userId", params: { userId: p.id } }),
                  )}
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

              {orbit.connected[p.id] && (
                <div className="mt-4 rounded-2xl bg-secondary/60 p-3">
                  <p className="pb-2 text-[11px] font-medium text-muted-foreground">
                    Connected — chat, meetups and live location unlocked
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMeetupFor(p)}
                      className="flex flex-col items-center gap-1 rounded-2xl bg-background/50 py-2.5 text-[10px] font-medium text-muted-foreground transition-transform active:scale-95"
                    >
                      <CalendarHeart className="h-[18px] w-[18px]" strokeWidth={1.7} />
                      Plan meetup
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!orbit.privacy.liveLocationEnabled) {
                          toast.warning("Turn on live location sharing in Privacy & Safety first.");
                          return;
                        }
                        setLiveFor(p);
                      }}
                      className="flex flex-col items-center gap-1 rounded-2xl bg-background/50 py-2.5 text-[10px] font-medium text-muted-foreground transition-transform active:scale-95"
                    >
                      <Navigation className="h-[18px] w-[18px]" strokeWidth={1.7} />
                      Live location
                    </button>
                  </div>
                </div>
              )}
            </div>

            {menuFor === p.id && <SafetyMenu profile={p} onClose={() => setMenuFor(null)} />}
          </article>
        ))}

        {ranked.length === 0 && (
          <p className="w-full py-16 text-center text-sm text-muted-foreground">
            No Orbit profiles match your search or filters.
          </p>
        )}
      </div>

      {ranked.length > 1 && (
        <p className="px-4 pt-3 text-center text-[11px] text-muted-foreground">
          Swipe left or right to browse · tap a photo or name to open the profile
        </p>
      )}

      {obscured && (
        <p className="fixed inset-x-0 bottom-6 z-50 px-6 text-center text-xs text-muted-foreground">
          Orbit content hidden while the app is in the background.
        </p>
      )}

      <OrbitLockedSheet open={locked} onOpenChange={setLocked} />

      <OrbitFiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        onChange={setFilters}
        resultCount={ranked.length}
      />

      {live.session.active && (
        <div className="fixed inset-x-4 bottom-4 z-50 flex items-center gap-3 rounded-full border border-border/60 glass px-4 py-3">
          <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-[oklch(0.72_0.19_145)]" />
          <p className="min-w-0 flex-1 truncate text-xs">
            Live location on {remainingLabel(live.session.endsAt)}
          </p>
          <button
            type="button"
            onClick={() => {
              live.stop();
              toast.success("Live location stopped");
            }}
            className="shrink-0 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-semibold text-background"
          >
            Stop
          </button>
        </div>
      )}

      <MeetupSheet
        open={meetupFor !== null}
        onOpenChange={(o) => !o && setMeetupFor(null)}
        onSend={() => {
          toast.success(`Meetup suggestion sent to ${meetupFor?.name}`);
          setMeetupFor(null);
        }}
      />

      <LiveLocationSheet
        open={liveFor !== null}
        onOpenChange={(o) => !o && setLiveFor(null)}
        peerName={liveFor?.name ?? ""}
        onConfirm={async (duration) => {
          const ok = await live.start(duration);
          toast[ok ? "success" : "error"](
            ok ? `Sharing live location with ${liveFor?.name}` : "Nothing was shared",
          );
          if (ok) setLiveFor(null);
          return ok;
        }}
      />
    </main>
  );
}

function TrustChip({ profile }: { profile: OrbitProfile }) {
  const t = analyzeProfile(profile);
  const tone =
    t.level === "trusted"
      ? "text-[oklch(0.75_0.16_150)]"
      : t.level === "review"
        ? "text-muted-foreground"
        : "text-destructive";
  const Icon = t.level === "flagged" ? AlertTriangle : ScanFace;
  return (
    <p className={`flex items-center gap-1.5 pt-3 text-[11px] font-medium ${tone}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
      {t.label} · {t.score}%
    </p>
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