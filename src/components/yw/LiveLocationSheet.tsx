import { useState } from "react";
import { Navigation, Shield, X, Clock3, Check } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  liveLocationDurations,
  type LiveLocationDuration,
} from "@/lib/live-location";
import { cn } from "@/lib/utils";

export function LiveLocationSheet({
  open,
  onOpenChange,
  peerName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  peerName: string;
  onConfirm: (duration: LiveLocationDuration) => Promise<boolean>;
}) {
  const [duration, setDuration] = useState<LiveLocationDuration | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setDuration(null);
    setBusy(false);
    onOpenChange(false);
  };

  const confirm = async () => {
    if (!duration || busy) return;
    setBusy(true);
    const ok = await onConfirm(duration);
    setBusy(false);
    if (ok) close();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <SheetContent
        side="bottom"
        className="max-h-[88dvh] overflow-y-auto rounded-t-3xl border-border/60 p-0 [&>button]:hidden"
      >
        <div className="px-5 pb-8 pt-5">
          <div className="flex items-start justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary">
              <Navigation className="h-5 w-5" strokeWidth={1.7} />
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-full bg-secondary/70 transition-transform active:scale-90"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>

          <h2 className="pt-4 font-display text-lg font-bold">Share live location</h2>
          <p className="pt-1.5 text-sm leading-relaxed text-muted-foreground">
            {peerName} will see where you are while sharing is on. Sharing is off until you
            choose a time window below.
          </p>
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-secondary/60 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
            Your exact position stays private until you tap Start, stops the moment you tap
            Stop, and is never shared with anyone else. {peerName} decides separately whether
            to share back.
          </p>

          <p className="pt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Share for
          </p>
          <div className="grid grid-cols-2 gap-2 pt-2.5">
            {liveLocationDurations.map((d) => {
              const on = duration?.id === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setDuration(d)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-3 text-left text-sm font-medium transition-colors",
                    on
                      ? "border-transparent brand-gradient text-primary-foreground"
                      : "border-border/60 bg-secondary/50 hover:bg-secondary",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.7} />
                    {d.label}
                  </span>
                  {on && <Check className="h-4 w-4 shrink-0" strokeWidth={2.2} />}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-6">
            <button
              type="button"
              onClick={close}
              className="rounded-full border border-border/60 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
            >
              Not now
            </button>
            <button
              type="button"
              disabled={!duration || busy}
              onClick={confirm}
              className="rounded-full brand-gradient py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-40"
            >
              {busy ? "Asking permission…" : "Start sharing"}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
