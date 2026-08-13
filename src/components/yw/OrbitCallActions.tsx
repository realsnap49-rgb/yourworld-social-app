import { useEffect, useState } from "react";
import {
  Phone,
  VideoIcon,
  Navigation,
  Ban,
  Flag,
  Camera,
  Lock,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { LiveLocationSheet } from "@/components/yw/LiveLocationSheet";
import { OrbitCallSheet, type OrbitCallMode } from "@/components/yw/OrbitCallSheet";
import { useOrbit, useScreenCaptureShield } from "@/lib/orbit-store";
import { useLiveLocation, remainingLabel } from "@/lib/live-location";
import type { OrbitProfile } from "@/lib/orbit-data";

/**
 * Calls, live location and safety actions for one Orbit person.
 * Invites now live in the Orbit chat input bar.
 * Every action stays locked until there is a match/connection, and calling can
 * be switched off entirely from Orbit privacy settings.
 */
export function OrbitCallActions({ profile }: { profile: OrbitProfile }) {
  const orbit = useOrbit();
  const live = useLiveLocation();
  const connected = !!orbit.connected[profile.id];
  const blocked = orbit.privacy.blocked.includes(profile.id);
  const callsOn = orbit.privacy.callsEnabled;

  const [call, setCall] = useState<OrbitCallMode | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);

  const captured = useScreenCaptureShield(orbit.privacy.screenshotAlerts && connected);
  useEffect(() => {
    if (captured) {
      toast.warning("Possible screenshot or screen recording detected", {
        description: `${profile.name} was notified too.`,
      });
    }
  }, [captured, profile.name]);

  const gate = (action: () => void) => () => {
    if (blocked) {
      toast.error(`${profile.name} is blocked. Unblock to continue.`);
      return;
    }
    if (!connected) {
      toast.warning("Available after you match or connect", {
        description: "Calls unlock once you're connected on Orbit.",
      });
      return;
    }
    action();
  };

  const startCall = (mode: OrbitCallMode) =>
    gate(() => {
      if (!callsOn) {
        toast.warning("Calls are turned off in your Orbit privacy settings.");
        return;
      }
      setCall(mode);
    })();

  const shareLocation = gate(() => {
    if (!orbit.privacy.liveLocationEnabled) {
      toast.warning("Turn on live location sharing in Orbit privacy first.");
      return;
    }
    setLocationOpen(true);
  });

  const report = () =>
    toast.success(`Report submitted for ${profile.name}`, {
      description: "Our safety team reviews every report.",
    });

  const toggleBlock = () => {
    orbit.toggleBlocked(profile.id);
    toast.success(blocked ? `${profile.name} unblocked` : `${profile.name} blocked`);
  };

  return (
    <section className="pt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Calls &amp; safety
        </h3>
        {!connected && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3" strokeWidth={2} /> After match
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3">
        <Tile
          icon={Phone}
          label="Voice"
          locked={!connected || !callsOn}
          onClick={() => startCall("voice")}
        />
        <Tile
          icon={VideoIcon}
          label="Video"
          locked={!connected || !callsOn}
          onClick={() => startCall("video")}
        />
        <Tile
          icon={Navigation}
          label="Live location"
          locked={!connected}
          active={live.session.active}
          onClick={shareLocation}
        />
      </div>

      {live.session.active && (
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/50 px-3.5 py-3">
          <p className="text-xs text-muted-foreground">
            Sharing live location with {profile.name} {remainingLabel(live.session.endsAt)}
          </p>
          <button
            type="button"
            onClick={() => {
              live.stop();
              toast.success("Live location stopped");
            }}
            className="flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-semibold text-background"
          >
            <Square className="h-3 w-3" strokeWidth={2.4} /> Stop
          </button>
        </div>
      )}

      <p className="mt-3 flex items-start gap-2 rounded-2xl bg-secondary/60 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
        <Camera className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
        {orbit.privacy.screenshotAlerts
          ? "Screenshot alerts are on — if a screenshot or recording is detected, you'll both be notified."
          : "Screenshot alerts are off. Turn them on in Orbit privacy to be notified of screen captures."}
      </p>

      <div className="grid grid-cols-2 gap-2 pt-3">
        <button
          type="button"
          onClick={toggleBlock}
          className="flex items-center justify-center gap-2 rounded-full border border-border/60 py-3 text-xs font-semibold transition-colors hover:bg-secondary"
        >
          <Ban className="h-4 w-4" strokeWidth={1.8} /> {blocked ? "Unblock" : "Block"}
        </button>
        <button
          type="button"
          onClick={report}
          className="flex items-center justify-center gap-2 rounded-full border border-border/60 py-3 text-xs font-semibold transition-colors hover:bg-secondary"
        >
          <Flag className="h-4 w-4" strokeWidth={1.8} /> Report
        </button>
      </div>

      <OrbitCallSheet
        mode={call}
        peerName={profile.name}
        peerPhoto={profile.photo}
        onClose={() => setCall(null)}
      />
      <LiveLocationSheet
        open={locationOpen}
        onOpenChange={setLocationOpen}
        peerName={profile.name}
        onConfirm={async (d) => {
          const ok = await live.start(d);
          if (ok) toast.success(`Sharing live location with ${profile.name}`);
          else toast.error(live.session.error ?? "Nothing was shared.");
          return ok;
        }}
      />
    </section>
  );
}

function Tile({
  icon: Icon,
  label,
  onClick,
  locked,
  active,
}: {
  icon: typeof Phone;
  label: string;
  onClick: () => void;
  locked?: boolean;
  active?: boolean;
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
        <Lock className="absolute right-1.5 top-1.5 h-3 w-3 text-muted-foreground/70" strokeWidth={2} />
      )}
    </button>
  );
}