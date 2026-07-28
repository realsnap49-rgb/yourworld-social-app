import { Link } from "@tanstack/react-router";
import { Sparkles, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { LOCKED_MESSAGE } from "@/lib/orbit-store";

export function OrbitLockedSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-border/60 p-0 [&>button]:hidden"
      >
        <div className="px-5 pb-8 pt-5">
          <div className="flex items-start justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary">
              <Sparkles className="h-5 w-5" strokeWidth={1.7} />
            </span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-full bg-secondary/70 transition-transform active:scale-90"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>

          <h2 className="pt-4 font-display text-lg font-bold">Orbit locked</h2>
          <p className="pt-1.5 text-sm leading-relaxed text-muted-foreground">{LOCKED_MESSAGE}</p>
          <p className="pt-2 text-xs leading-relaxed text-muted-foreground/80">
            Browsing stays free and anonymous. Your Orbit Profile is separate from your main
            YourWorld profile and can be paused or deleted anytime.
          </p>

          <Link
            to="/orbit/create"
            onClick={() => onOpenChange(false)}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background transition-transform active:scale-[0.99]"
          >
            Create Orbit Profile
          </Link>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="mt-2 h-11 w-full rounded-full text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Keep browsing
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}