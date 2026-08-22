import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin, Search, Star, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { searchPlaces, type PlaceResult } from "@/lib/places.functions";
import { inviteById, type InviteKind } from "@/lib/orbit-invites";

export function PlacePickerSheet({
  open,
  kind,
  region,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  kind: InviteKind | null;
  region?: string;
  onOpenChange: (o: boolean) => void;
  onSelect: (place: PlaceResult) => void;
}) {
  const run = useServerFn(searchPlaces);
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) return;
      setLoading(true);
      setNote(null);
      try {
        const res = await run({ data: { query: q, region } });
        setPlaces(res.places);
        if (res.places.length === 0)
          setNote("No places matched — try adding a city, e.g. “cafes in Mumbai”.");
      } catch {
        setPlaces([]);
        setNote("Couldn't load places right now. Try another search.");
      } finally {
        setLoading(false);
      }
    },
    [region, run],
  );

  useEffect(() => {
    if (!open || !kind) return;
    const seed = inviteById(kind).query;
    setQuery(seed);
    setPlaces([]);
    void search(seed);
  }, [open, kind, search]);

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

          <h2 className="pt-4 font-display text-lg font-bold">
            {kind ? `Find a place · ${inviteById(kind).label}` : "Find a place"}
          </h2>
          <p className="pt-1.5 text-sm leading-relaxed text-muted-foreground">
            Search public places {region ? `around ${region}` : "nearby"} and send it as an invite.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void search(query);
            }}
            className="mt-4 flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5"
          >
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cafés, cinemas, parks…"
              aria-label="Search places"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </form>

          {note && <p className="pt-3 text-xs text-muted-foreground">{note}</p>}

          <ul className="mt-3 space-y-2">
            {places.map((p) => (
              <li key={p.id} className="rounded-2xl border border-border/60 bg-secondary/40 p-3.5">
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="pt-0.5 text-xs text-muted-foreground">{p.address}</p>
                <p className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground/85">
                  {typeof p.rating === "number" && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" strokeWidth={1.8} /> {p.rating.toFixed(1)}
                    </span>
                  )}
                  {typeof p.open === "boolean" && <span>{p.open ? "Open now" : "Closed now"}</span>}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(p);
                    onOpenChange(false);
                  }}
                  className="mt-3 h-10 w-full rounded-full brand-gradient text-xs font-semibold text-primary-foreground transition-transform active:scale-[0.99]"
                >
                  Send invite
                </button>
              </li>
            ))}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
