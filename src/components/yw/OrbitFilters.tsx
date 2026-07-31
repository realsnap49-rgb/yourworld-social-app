import { Search, SlidersHorizontal, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { GEO_COUNTRIES, statesOf, citiesOf } from "@/lib/geo-data";
import { ORBIT_HOBBIES, ORBIT_LOOKING_FOR } from "@/lib/orbit-store";
import type { OrbitProfile } from "@/lib/orbit-data";

export type OrbitFilterState = {
  query: string;
  country: string;
  state: string;
  city: string;
  minAge: number;
  maxAge: number;
  /** Women / Men / Everyone — matches the person's own gender. */
  gender: string;
  /** What the person is looking for. */
  lookingFor: string;
  hobbies: string[];
};

export const AGE_MIN = 18;
export const AGE_MAX = 60;

export const emptyOrbitFilters: OrbitFilterState = {
  query: "",
  country: "",
  state: "",
  city: "",
  minAge: AGE_MIN,
  maxAge: AGE_MAX,
  gender: "Everyone",
  lookingFor: "",
  hobbies: [],
};

export function activeFilterCount(f: OrbitFilterState) {
  let n = 0;
  if (f.country) n += 1;
  if (f.state) n += 1;
  if (f.city) n += 1;
  if (f.minAge !== AGE_MIN || f.maxAge !== AGE_MAX) n += 1;
  if (f.gender !== "Everyone") n += 1;
  if (f.lookingFor) n += 1;
  if (f.hobbies.length) n += 1;
  return n;
}

/** Pure client-side matcher — no location beyond the public city is used. */
export function matchesOrbitFilters(p: OrbitProfile, f: OrbitFilterState) {
  const q = f.query.trim().toLowerCase();
  if (q && !p.name.toLowerCase().includes(q)) return false;
  if (f.country && p.country !== f.country) return false;
  if (f.state && p.state !== f.state) return false;
  if (f.city && p.city !== f.city) return false;
  if (p.age < f.minAge || p.age > f.maxAge) return false;
  if (f.gender !== "Everyone" && p.gender !== f.gender) return false;
  if (f.lookingFor && p.lookingFor !== f.lookingFor) return false;
  if (f.hobbies.length && !f.hobbies.some((h) => p.hobbies.includes(h))) return false;
  return true;
}

const selectClass =
  "h-11 w-full rounded-2xl bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

const labelClass = "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

export function OrbitFilterBar({
  filters,
  onChange,
  onOpen,
  resultCount,
}: {
  filters: OrbitFilterState;
  onChange: (f: OrbitFilterState) => void;
  onOpen: () => void;
  resultCount: number;
}) {
  const count = activeFilterCount(filters);
  return (
    <div className="px-4 pt-4">
      <div className="flex items-center gap-2">
        <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-secondary px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder="Search by name"
            aria-label="Search Orbit profiles by name"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="button"
          onClick={onOpen}
          aria-label="Open Orbit filters"
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full chip transition-transform active:scale-90"
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" strokeWidth={1.7} />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 text-[9px] font-bold text-background">
              {count}
            </span>
          )}
        </button>
      </div>
      {(count > 0 || filters.query.trim()) && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-muted-foreground">
            {resultCount} {resultCount === 1 ? "profile" : "profiles"} match
          </p>
          <button
            type="button"
            onClick={() => onChange(emptyOrbitFilters)}
            className="text-[11px] font-medium text-muted-foreground transition-opacity active:opacity-60"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

export function OrbitFiltersSheet({
  open,
  onOpenChange,
  filters,
  onChange,
  resultCount,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  filters: OrbitFilterState;
  onChange: (f: OrbitFilterState) => void;
  resultCount: number;
}) {
  const set = (patch: Partial<OrbitFilterState>) => onChange({ ...filters, ...patch });

  const toggleHobby = (h: string) =>
    set({
      hobbies: filters.hobbies.includes(h)
        ? filters.hobbies.filter((x) => x !== h)
        : [...filters.hobbies, h],
    });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[88vh] overflow-y-auto rounded-t-3xl border-border/60 p-0 [&>button]:hidden"
      >
        <div className="px-5 pb-8 pt-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Filters</h2>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close filters"
              className="grid h-8 w-8 place-items-center rounded-full bg-secondary/70 transition-transform active:scale-90"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>

          <div className="space-y-4 pt-5">
            <div>
              <label htmlFor="f-country" className={labelClass}>
                Country
              </label>
              <select
                id="f-country"
                value={filters.country}
                onChange={(e) => set({ country: e.target.value, state: "", city: "" })}
                className={`${selectClass} mt-1.5`}
              >
                <option value="">Any country</option>
                {GEO_COUNTRIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="f-state" className={labelClass}>
                State
              </label>
              <select
                id="f-state"
                value={filters.state}
                disabled={!filters.country}
                onChange={(e) => set({ state: e.target.value, city: "" })}
                className={`${selectClass} mt-1.5 disabled:opacity-50`}
              >
                <option value="">Any state</option>
                {statesOf(filters.country).map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="f-city" className={labelClass}>
                City
              </label>
              <select
                id="f-city"
                value={filters.city}
                disabled={!filters.state}
                onChange={(e) => set({ city: e.target.value })}
                className={`${selectClass} mt-1.5 disabled:opacity-50`}
              >
                <option value="">Any city</option>
                {citiesOf(filters.country, filters.state).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className={labelClass}>
                Age range · {filters.minAge}–{filters.maxAge}
              </p>
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="range"
                  min={AGE_MIN}
                  max={AGE_MAX}
                  value={filters.minAge}
                  aria-label="Minimum age"
                  onChange={(e) =>
                    set({ minAge: Math.min(Number(e.target.value), filters.maxAge) })
                  }
                  className="h-1.5 w-full accent-[currentColor]"
                />
                <input
                  type="range"
                  min={AGE_MIN}
                  max={AGE_MAX}
                  value={filters.maxAge}
                  aria-label="Maximum age"
                  onChange={(e) =>
                    set({ maxAge: Math.max(Number(e.target.value), filters.minAge) })
                  }
                  className="h-1.5 w-full accent-[currentColor]"
                />
              </div>
            </div>

            <div>
              <p className={labelClass}>Show me</p>
              <div className="flex gap-2 pt-2">
                {["Women", "Men", "Everyone"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={filters.gender === g}
                    onClick={() => set({ gender: g })}
                    className={`flex-1 rounded-full px-3 py-2 text-xs font-medium transition-all active:scale-95 ${
                      filters.gender === g ? "bg-foreground text-background" : "chip text-muted-foreground"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="f-looking" className={labelClass}>
                Looking for
              </label>
              <select
                id="f-looking"
                value={filters.lookingFor}
                onChange={(e) => set({ lookingFor: e.target.value })}
                className={`${selectClass} mt-1.5`}
              >
                <option value="">Any preference</option>
                {ORBIT_LOOKING_FOR.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className={labelClass}>Hobbies</p>
              <div className="flex flex-wrap gap-1.5 pt-2">
                {ORBIT_HOBBIES.map((h) => {
                  const active = filters.hobbies.includes(h);
                  return (
                    <button
                      key={h}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleHobby(h)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all active:scale-95 ${
                        active ? "bg-foreground text-background" : "chip text-muted-foreground"
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="pt-4 text-[11px] leading-relaxed text-muted-foreground">
            Country and state are only used to narrow results — only the city is ever shown
            publicly, and exact locations are never shared.
          </p>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={() => onChange(emptyOrbitFilters)}
              className="h-12 flex-1 rounded-full chip text-sm font-medium text-muted-foreground transition-transform active:scale-[0.99]"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-12 flex-[1.4] rounded-full bg-foreground text-sm font-semibold text-background transition-transform active:scale-[0.99]"
            >
              Show {resultCount} {resultCount === 1 ? "profile" : "profiles"}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
