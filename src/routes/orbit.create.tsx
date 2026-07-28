import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ShieldCheck, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useOrbit, type OrbitProfileDraft } from "@/lib/orbit-store";
import { ORBIT_MOODS } from "@/lib/orbit-mood";

export const Route = createFileRoute("/orbit/create")({
  head: () => ({
    meta: [
      { title: "Create your Orbit Profile — YourWorld" },
      {
        name: "description",
        content:
          "Set up an Orbit Profile to like, message, connect and match. Separate from your main profile and deletable anytime.",
      },
      { property: "og:title", content: "Create your Orbit Profile — YourWorld" },
      {
        property: "og:description",
        content: "A separate, private Orbit identity with approximate location only.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrbitCreate,
});

const INTERESTS = [
  "Photography",
  "Music",
  "Travel",
  "Food",
  "Fitness",
  "Gaming",
  "Art",
  "Film",
  "Books",
  "Coffee",
  "Surf",
  "Dance",
];

const AREAS = ["Nearby area", "City centre", "Coastal district", "Old town", "Riverside"];

function OrbitCreate() {
  const orbit = useOrbit();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<OrbitProfileDraft>(
    orbit.profile ?? {
      name: "",
      handle: "",
      age: "",
      area: AREAS[0],
      headline: "",
      about: "",
      interests: [],
      mood: null,
    },
  );

  const set = <K extends keyof OrbitProfileDraft>(k: K, v: OrbitProfileDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const valid = draft.name.trim() && draft.handle.trim() && Number(draft.age) >= 18;

  return (
    <main className="min-h-screen pb-12">
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-border glass px-3 py-3">
        <Link
          to="/orbit"
          aria-label="Back to Orbit"
          className="grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
        </Link>
        <h1 className="font-display text-lg font-bold">
          {orbit.hasProfile ? "Edit Orbit Profile" : "Create Orbit Profile"}
        </h1>
      </header>

      <div className="px-4 pt-4">
        <div className="surface-card flex items-start gap-3 rounded-3xl p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-secondary">
            <ShieldCheck className="h-5 w-5" strokeWidth={1.7} />
          </span>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Your Orbit Profile is completely separate from your main YourWorld profile. Nothing here
            appears on your main profile, and you can pause or delete it anytime.
          </p>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-5">
        <Field label="Orbit Display Name">
          <Input
            value={draft.name}
            maxLength={40}
            onChange={(e) => set("name", e.target.value)}
            placeholder="How you appear in Orbit"
            className="h-11 rounded-xl"
          />
        </Field>

        <Field label="Orbit Handle">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              @
            </span>
            <Input
              value={draft.handle}
              maxLength={30}
              onChange={(e) => set("handle", e.target.value.replace(/[^\w.]/g, "").toLowerCase())}
              placeholder="orbit.handle"
              className="h-11 rounded-xl pl-7"
            />
          </div>
        </Field>

        <Field label="Age (18+)">
          <Input
            value={draft.age}
            inputMode="numeric"
            maxLength={2}
            onChange={(e) => set("age", e.target.value.replace(/\D/g, ""))}
            placeholder="18"
            className="h-11 rounded-xl"
          />
        </Field>

        <Field label="Approximate area">
          <div className="flex flex-wrap gap-2">
            {AREAS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => set("area", a)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                  draft.area === a ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          <p className="flex items-center gap-1 pt-2 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" strokeWidth={1.8} />
            Only a broad area is ever shared — never your exact location.
          </p>
        </Field>

        <Field label="Headline">
          <Input
            value={draft.headline}
            maxLength={60}
            onChange={(e) => set("headline", e.target.value)}
            placeholder="One line about you"
            className="h-11 rounded-xl"
          />
        </Field>

        <Field label="About">
          <Textarea
            value={draft.about}
            maxLength={300}
            rows={5}
            onChange={(e) => set("about", e.target.value)}
            placeholder="What you're here for"
            className="min-h-28 rounded-xl leading-relaxed"
          />
          <p className="pt-1 text-right text-[11px] text-muted-foreground">
            {draft.about.length}/300
          </p>
        </Field>

        <Field label="Interests">
          <div className="hidden" />
        </Field>

        <Field label="Orbit Mood (optional)">
          <div className="flex flex-wrap gap-2">
            {ORBIT_MOODS.map((m) => {
              const active = draft.mood === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set("mood", active ? null : m.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                    active ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <span aria-hidden className="mr-1">{m.emoji}</span>
                  {m.label}
                </button>
              );
            })}
          </div>
          <p className="pt-2 text-[11px] text-muted-foreground">
            Optional. Helps Orbit show people looking for the same thing — change it anytime.
          </p>
        </Field>

        <Field label="Interests">
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((t) => {
              const active = draft.interests.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    set(
                      "interests",
                      active ? draft.interests.filter((x) => x !== t) : [...draft.interests, t],
                    )
                  }
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                    active ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-4">
          <Button
            variant="secondary"
            className="h-11 rounded-full"
            onClick={() => navigate({ to: "/orbit" })}
          >
            Cancel
          </Button>
          <Button
            className="h-11 rounded-full"
            disabled={!valid}
            onClick={() => {
              orbit.saveProfile(draft);
              toast.success("Orbit Profile created — all features unlocked");
              navigate({ to: "/orbit" });
            }}
          >
            {orbit.hasProfile ? "Save Changes" : "Create Profile"}
          </Button>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}