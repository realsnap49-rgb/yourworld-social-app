import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, BellOff, ChevronLeft, EyeOff, Lock, MapPin, Navigation, ScanFace, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { orbitProfiles } from "@/lib/orbit-data";
import { clearSessionUnlock, useOrbit, type OrbitAudience, type OrbitVisibility } from "@/lib/orbit-store";

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
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

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

        <Card title="Private &amp; secure">
          <Row
            label="Lock Orbit"
            hint={
              privacy.lockEnabled
                ? "A PIN or password is required to open Orbit"
                : "Ask for a PIN or password before Orbit opens"
            }
            control={
              <Switch
                checked={privacy.lockEnabled}
                onCheckedChange={(v) => {
                  if (v) {
                    setPin("");
                    setPinConfirm("");
                    setPinError(null);
                    setPinOpen(true);
                  } else {
                    orbit.disableOrbitLock();
                    clearSessionUnlock();
                    toast.success("Orbit lock removed");
                  }
                }}
              />
            }
          />
          {privacy.lockEnabled && (
            <Row
              label="Change PIN"
              hint="Set a new PIN or password for this device"
              control={
                <button
                  type="button"
                  onClick={() => {
                    setPin("");
                    setPinConfirm("");
                    setPinError(null);
                    setPinOpen(true);
                  }}
                  className="rounded-full bg-secondary px-3.5 py-2 text-xs font-semibold transition-transform active:scale-95"
                >
                  Change
                </button>
              }
            />
          )}
          <Row
            label="Hide Orbit"
            hint="Remove Orbit from menus and search on this device"
            control={
              <Switch
                checked={privacy.hideOrbitEntry}
                onCheckedChange={(v) => {
                  orbit.setPrivacy({ hideOrbitEntry: v });
                  toast.success(v ? "Orbit hidden from menus" : "Orbit visible in menus");
                }}
              />
            }
          />
          <Row
            label="Hide Orbit notifications"
            hint="Mute Orbit, connection and match alerts everywhere"
            control={
              <Switch
                checked={privacy.hideOrbitNotifications}
                onCheckedChange={(v) => {
                  orbit.setPrivacy({ hideOrbitNotifications: v });
                  toast.success(v ? "Orbit notifications hidden" : "Orbit notifications restored");
                }}
              />
            }
          />
          <div className="flex items-start gap-3 border-t border-border/60 px-4 py-3.5">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Your PIN is hashed on this device and never stored or sent anywhere. If you forget it,
              turn the lock off from this screen after unlocking.
            </p>
          </div>
          <div className="flex items-start gap-3 border-t border-border/60 px-4 py-3.5">
            <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Hiding Orbit keeps your profile and matches intact — it only removes Orbit from view.
            </p>
          </div>
        </Card>

        <Card title="Visibility">
          <Row
            label="Show my Looking For"
            hint="Display your Looking For preference as a small badge on your Orbit profile"
            control={
              <Switch
                checked={privacy.showMood}
                onCheckedChange={(v) => {
                  orbit.setPrivacy({ showMood: v });
                  toast.success(v ? "Looking For badge shown" : "Looking For kept private");
                }}
              />
            }
          />
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
          <div className="px-4 pt-3.5">
            <Input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Search users"
              aria-label="Search users"
              className="rounded-2xl"
            />
          </div>
          <ul className="px-4 py-2">
            {filteredProfiles.map((p) => (
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
            {filteredProfiles.length === 0 && (
              <li className="py-4 text-center text-xs text-muted-foreground">No users found</li>
            )}
          </ul>
        </Card>

        <Card title="Safety">
          <Row
            label="AI fake profile detection"
            hint="Scans public profile details on your device and labels suspicious accounts"
            control={
              <Switch
                checked={privacy.aiFakeDetection}
                onCheckedChange={(v) => {
                  orbit.setPrivacy({ aiFakeDetection: v });
                  toast.success(v ? "Fake profile detection on" : "Fake profile detection off");
                }}
              />
            }
          />
          {privacy.aiFakeDetection && (
            <Row
              label="Hide flagged profiles"
              hint="Remove likely fake accounts from discovery instead of just labelling them"
              control={
                <Switch
                  checked={privacy.hideFlaggedProfiles}
                  onCheckedChange={(v) => orbit.setPrivacy({ hideFlaggedProfiles: v })}
                />
              }
            />
          )}
          <div className="flex items-start gap-3 border-t border-border/60 px-4 py-3.5">
            <ScanFace className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Detection runs entirely on your device using public profile details. It's a signal,
              not a guarantee — always report anything that feels off.
            </p>
          </div>
        </Card>

        <Card title="Verified badge">
          <Row
            label="Optional verification"
            hint={
              privacy.verification === "verified"
                ? "Your Orbit Profile shows a verified badge"
                : privacy.verification === "pending"
                  ? "Review in progress — usually under 48 hours"
                  : "Completely optional. Orbit works fully without it."
            }
            control={
              privacy.verification === "verified" ? (
                <BadgeCheck
                  className="h-5 w-5 fill-[oklch(0.62_0.17_255)] text-background"
                  strokeWidth={1.8}
                />
              ) : (
                <button
                  type="button"
                  disabled={privacy.verification === "pending"}
                  onClick={() => {
                    orbit.setPrivacy({ verification: "pending" });
                    toast.success("Verification request submitted");
                  }}
                  className="rounded-full bg-foreground px-3.5 py-2 text-xs font-semibold text-background transition-transform active:scale-95 disabled:opacity-50"
                >
                  {privacy.verification === "pending" ? "Pending" : "Request"}
                </button>
              )
            }
          />
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
          <div className="border-t border-border/60">
            <Row
              label="Notify me about screen capture"
              hint="Notify me if someone takes a screenshot or screen recording (on supported devices). If detected, both users are instantly notified."
              control={
                <Switch
                  checked={privacy.screenshotAlerts}
                  onCheckedChange={(v) => {
                    orbit.setPrivacy({ screenshotAlerts: v });
                    toast.success(v ? "Screen capture alerts on" : "Screen capture alerts off");
                  }}
                />
              }
            />
          </div>
        </Card>
      </div>

      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Set Orbit PIN</DialogTitle>
            <DialogDescription>
              4 characters or more. Stored hashed on this device only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              inputMode="numeric"
              value={pin}
              maxLength={64}
              autoComplete="new-password"
              onChange={(e) => {
                setPin(e.target.value);
                setPinError(null);
              }}
              placeholder="New PIN or password"
              aria-label="New Orbit PIN"
              className="h-11 rounded-xl"
            />
            <Input
              type="password"
              inputMode="numeric"
              value={pinConfirm}
              maxLength={64}
              autoComplete="new-password"
              onChange={(e) => {
                setPinConfirm(e.target.value);
                setPinError(null);
              }}
              placeholder="Confirm PIN"
              aria-label="Confirm Orbit PIN"
              className="h-11 rounded-xl"
            />
            {pinError && <p className="text-xs text-destructive">{pinError}</p>}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button variant="secondary" className="h-11 rounded-full" onClick={() => setPinOpen(false)}>
                Cancel
              </Button>
              <Button
                className="h-11 rounded-full"
                onClick={async () => {
                  if (pin.trim().length < 4) return setPinError("Use at least 4 characters.");
                  if (pin !== pinConfirm) return setPinError("PINs don't match.");
                  await orbit.setOrbitPin(pin);
                  setPinOpen(false);
                  setPin("");
                  setPinConfirm("");
                  toast.success("Orbit lock enabled");
                }}
              >
                Save PIN
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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