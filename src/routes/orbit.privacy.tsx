import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, EyeOff, MapPin, Navigation, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { orbitProfiles } from "@/lib/orbit-data";
import { useOrbit, type OrbitAudience, type OrbitVisibility } from "@/lib/orbit-store";

export const Route = createFileRoute("/orbit/privacy")({
  head: () => ({
    meta: [
      { title: "Orbit Privacy & Safety — YourWorld" },
      {
        name: "description",
        content:
          "Control Orbit visibility, who can like, message and connect, hidden and blocked users, and screen-capture protection.",
      },
      { property: "og:title", content: "Orbit Privacy & Safety — YourWorld" },
      {
        property: "og:description",
        content: "Visibility, permissions, hidden users, blocking and capture protection for Orbit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrbitPrivacy,
});

const VISIBILITY: { value: OrbitVisibility; label: string; hint: string }[] = [
  { value: "public", label: "Public", hint: "Anyone on Orbit can find you" },
  { value: "friends", label: "Friends", hint: "Only people you already follow" },
  { value: "hidden", label: "Hidden", hint: "You browse, nobody sees you" },
];

const AUDIENCE: { value: OrbitAudience; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "connections", label: "Connections" },
  { value: "nobody", label: "Nobody" },
];

function OrbitPrivacy() {
  const orbit = useOrbit();
  const { privacy } = orbit;
  const [captureSupported, setCaptureSupported] = useState(true);

  useEffect(() => {
    // OS-level screenshot blocking is only available in native/secure shells.
    const supported =
      typeof window !== "undefined" &&
      // @ts-expect-error - present only in native wrappers that expose the API
      typeof window.__ywSecureDisplay?.enable === "function";
    setCaptureSupported(!!supported);
  }, []);

  return (
    <main className="min-h-screen pb-14">
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-border glass px-3 py-3">
        <Link
          to="/orbit"
          aria-label="Back to Orbit"
          className="grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
        </Link>
        <h1 className="font-display text-lg font-bold">Privacy &amp; Safety</h1>
      </header>

      <div className="space-y-5 px-4 pt-5">
        <Card title="Orbit">
          <Row
            label="Orbit enabled"
            hint="Turn Orbit completely off anytime"
            control={
              <Switch
                checked={privacy.orbitEnabled}
                onCheckedChange={(v) => {
                  orbit.setPrivacy({ orbitEnabled: v });
                  toast.success(v ? "Orbit turned on" : "Orbit turned off");
                }}
              />
            }
          />
          <Row
            label="Pause Orbit Profile"
            hint="Stay signed up but disappear from discovery"
            control={
              <Switch
                checked={privacy.paused}
                onCheckedChange={(v) => {
                  orbit.setPrivacy({ paused: v });
                  toast.success(v ? "Orbit Profile paused" : "Orbit Profile resumed");
                }}
              />
            }
          />
          <Row
            label="Hide Orbit Profile"
            hint="Keep your profile private while you keep browsing"
            control={
              <Switch
                checked={privacy.hiddenProfile}
                onCheckedChange={(v) => {
                  orbit.setPrivacy({ hiddenProfile: v, ...(v ? { visibility: "hidden" as const } : {}) });
                  toast.success(v ? "Orbit Profile hidden" : "Orbit Profile visible again");
                }}
              />
            }
          />
          <div className="flex items-start gap-3 px-4 py-3.5">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Your Orbit Profile stays linked to your account. You can turn Orbit off, pause it or
              hide it anytime — it is never shown while any of those are on.
            </p>
          </div>
        </Card>

        <Card title="Visibility">
          <div className="space-y-2 px-4 py-3.5">
            {VISIBILITY.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => orbit.setPrivacy({ visibility: v.value })}
                className={`flex w-full items-center justify-between rounded-2xl px-3.5 py-3 text-left transition-all active:scale-[0.99] ${
                  privacy.visibility === v.value ? "bg-foreground text-background" : "chip"
                }`}
              >
                <span>
                  <span className="block text-sm font-medium">{v.label}</span>
                  <span
                    className={`block text-xs ${
                      privacy.visibility === v.value ? "opacity-70" : "text-muted-foreground"
                    }`}
                  >
                    {v.hint}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Who can reach you">
          <Segmented
            label="Who can Like"
            value={privacy.whoCanLike}
            onChange={(v) => orbit.setPrivacy({ whoCanLike: v })}
          />
          <Segmented
            label="Who can Message"
            value={privacy.whoCanMessage}
            onChange={(v) => orbit.setPrivacy({ whoCanMessage: v })}
          />
          <Segmented
            label="Who can Connect"
            value={privacy.whoCanConnect}
            onChange={(v) => orbit.setPrivacy({ whoCanConnect: v })}
          />
        </Card>

        <Card title="Live location">
          <Row
            label="Allow live location sharing"
            hint="Off by default — nothing is shared until you start a session"
            control={
              <Switch
                checked={privacy.liveLocationEnabled}
                onCheckedChange={(v) => {
                  orbit.setPrivacy({ liveLocationEnabled: v });
                  toast.success(v ? "Live location sharing available" : "Live location sharing disabled");
                }}
              />
            }
          />
          {privacy.liveLocationEnabled && (
            <Segmented
              label="Who can request live location"
              value={privacy.whoCanRequestLiveLocation}
              onChange={(v) => orbit.setPrivacy({ whoCanRequestLiveLocation: v })}
            />
          )}
          <div className="flex items-start gap-3 border-t border-border/60 px-4 py-3.5">
            <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Each session asks for permission, runs only for the window you pick, and can be
              stopped with one tap from the chat.
            </p>
          </div>
        </Card>

        <Card title="Hide from specific users">
          <ul className="px-4 py-2">
            {orbitProfiles.map((p) => (
              <li key={p.id} className="flex items-center justify-between border-b border-border/60 py-3 last:border-0">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">@{p.handle}</span>
                </span>
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => orbit.toggleHiddenFrom(p.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                      privacy.hiddenFrom.includes(p.id)
                        ? "bg-foreground text-background"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {privacy.hiddenFrom.includes(p.id) ? "Hidden" : "Hide"}
                  </button>
                  <button
                    type="button"
                    onClick={() => orbit.toggleBlocked(p.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                      privacy.blocked.includes(p.id)
                        ? "bg-destructive/20 text-destructive"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {privacy.blocked.includes(p.id) ? "Blocked" : "Block"}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Location">
          <div className="flex items-start gap-3 px-4 py-3.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Orbit only ever shows an approximate area and a rounded distance band. Exact
              coordinates are never stored or shared, and this cannot be turned off.
            </p>
          </div>
        </Card>

        <Card title="Screen capture">
          <Row
            label="Prevent screenshots &amp; recording"
            hint="Enforced by the device wherever supported"
            control={
              <Switch
                checked={privacy.screenshotProtection}
                onCheckedChange={(v) => {
                  orbit.setPrivacy({ screenshotProtection: v });
                  if (v && !captureSupported) {
                    toast.warning(
                      "This device can't block screenshots — Orbit will hide content when the app leaves the screen instead.",
                    );
                  }
                }}
              />
            }
          />
          {privacy.screenshotProtection && !captureSupported && (
            <div className="flex items-start gap-3 border-t border-border/60 px-4 py-3.5">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Your device or browser doesn't support blocking screen capture. Orbit falls back to
                blurring content whenever the app is backgrounded or loses focus.
              </p>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="pb-2 pl-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="surface-card overflow-hidden rounded-3xl">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  control,
}: {
  label: string;
  hint?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3.5 last:border-0">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      {control}
    </div>
  );
}

function Segmented({
  label,
  value,
  onChange,
}: {
  label: string;
  value: OrbitAudience;
  onChange: (v: OrbitAudience) => void;
}) {
  return (
    <div className="border-b border-border/60 px-4 py-3.5 last:border-0">
      <p className="pb-2 text-sm font-medium">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {AUDIENCE.map((a) => (
          <button
            key={a.value}
            type="button"
            onClick={() => onChange(a.value)}
            className={`rounded-full py-2 text-xs font-medium transition-all active:scale-95 ${
              value === a.value ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}