import { useState } from "react";
import { Clock3, MapPin, Shield, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  meetupCategories,
  meetupMessage,
  meetupTimeSlots,
  placesFor,
  type MeetupCategoryId,
  type MeetupPlace,
  type MeetupTimeSlot,
} from "@/lib/meetup-data";
import { cn } from "@/lib/utils";

export function MeetupSheet({
  open,
  onOpenChange,
  onSend,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSend: (body: string) => void;
}) {
  const [category, setCategory] = useState<MeetupCategoryId>("cafes");
  const [when, setWhen] = useState<MeetupTimeSlot>(meetupTimeSlots[0]);
  const places = placesFor(category);

  const send = (place: MeetupPlace) => {
    onSend(meetupMessage(place, when));
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[88dvh] overflow-y-auto rounded-t-3xl border-border/60 p-0 [&>button]:hidden"
      >
        <div className="px-5 pb-8 pt-5">
          <div className="flex items-start justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary">
              <MapPin className="h-5 w-5" strokeWidth={1.7} />
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

          <h2 className="pt-4 font-display text-lg font-bold">Plan a meetup</h2>
          <p className="pt-1.5 text-sm leading-relaxed text-muted-foreground">
            Safe, busy public places picked from the approximate areas you both share.
          </p>
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-secondary/60 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
            Exact locations are never shared — only general areas. Hotels and private stays are
            excluded.
          </p>

          <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {meetupCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                aria-pressed={category === c.id}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors",
                  category === c.id
                    ? "bg-foreground text-background"
                    : "bg-secondary text-muted-foreground",
                )}
              >
                <span aria-hidden>{c.emoji}</span> {c.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            {meetupTimeSlots.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setWhen(t)}
                aria-pressed={when === t}
                className={cn(
                  "flex-1 rounded-full px-2 py-2 text-[11px] font-medium transition-colors",
                  when === t ? "bg-secondary text-foreground" : "text-muted-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <ul className="mt-3 space-y-2">
            {places.map((p) => (
              <li
                key={p.id}
                className="rounded-2xl border border-border/60 bg-secondary/40 p-3.5"
              >
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="pt-0.5 text-xs text-muted-foreground">
                  {p.area} · {p.fairness}
                </p>
                <p className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground/85">
                  <Clock3 className="h-3 w-3" strokeWidth={1.8} /> {p.hours}
                  <span aria-hidden>·</span>
                  <Shield className="h-3 w-3" strokeWidth={1.8} /> {p.safety}
                </p>
                <button
                  type="button"
                  onClick={() => send(p)}
                  className="mt-3 h-10 w-full rounded-full brand-gradient text-xs font-semibold text-primary-foreground transition-transform active:scale-[0.99]"
                >
                  Send suggestion
                </button>
              </li>
            ))}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}