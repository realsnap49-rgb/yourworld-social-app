import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  useOrbit,
  ORBIT_HOBBIES,
  ORBIT_HOBBY_MAX,
  ORBIT_LOOKING_FOR,
  type OrbitProfileDraft,
} from "@/lib/orbit-store";
import { OrbitPhotos } from "@/components/yw/OrbitPhotos";
import { GEO_COUNTRIES, citiesOf, statesOf } from "@/lib/geo-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

function OrbitCreate() {
  const orbit = useOrbit();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<OrbitProfileDraft>({
    name: "",
    age: "",
    country: "",
    state: "",
    city: "",
    about: "",
    hobbies: [],
    lookingFor: "",
    photos: [],
    originalPhotoPrivacy: "matched",
    mood: null,
    ...(orbit.profile ?? {}),
  });

  const set = <K extends keyof OrbitProfileDraft>(k: K, v: OrbitProfileDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const valid =
    draft.name.trim() &&
    Number(draft.age) >= 18 &&
    draft.photos.length >= 1 &&
    draft.country &&
    draft.city;

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

      <div className="space-y-4 px-4 pt-5">
        <Field label="Profile Photos">
          <OrbitPhotos
            photos={draft.photos}
            privacy={draft.originalPhotoPrivacy}
            onChange={(p) => set("photos", p)}
            onPrivacyChange={(p) => set("originalPhotoPrivacy", p)}
          />
        </Field>

        <Field label="Orbit Display Name">
          <Input
            value={draft.name}
            maxLength={40}
            onChange={(e) => set("name", e.target.value)}
            placeholder="How you appear in Orbit"
            className="h-11 rounded-xl"
          />
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

        <Field label="Location">
          <div className="space-y-2">
            <Select
              value={draft.country || undefined}
              onValueChange={(v) =>
                setDraft((d) => ({ ...d, country: v, state: "", city: "" }))
              }
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                {GEO_COUNTRIES.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={draft.state || undefined}
              disabled={!draft.country}
              onValueChange={(v) => setDraft((d) => ({ ...d, state: v, city: "" }))}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="State / Region" />
              </SelectTrigger>
              <SelectContent>
                {statesOf(draft.country).map((s) => (
                  <SelectItem key={s.name} value={s.name}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={draft.city || undefined}
              disabled={!draft.state}
              onValueChange={(v) => set("city", v)}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                {citiesOf(draft.country, draft.state).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="flex items-center gap-1 pt-2 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" strokeWidth={1.8} />
            Only your city is visible publicly — your exact location is never shared.
          </p>
        </Field>

        <Field label="Looking For">
          <Select
            value={draft.lookingFor || undefined}
            onValueChange={(v) => set("lookingFor", v)}
          >
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Select Preference" />
            </SelectTrigger>
            <SelectContent>
              {ORBIT_LOOKING_FOR.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="pt-2 text-[11px] text-muted-foreground">
            Only used to personalize Orbit recommendations and matching. You can change it
            anytime.
          </p>
        </Field>

        <Field label={`Hobbies (Max ${ORBIT_HOBBY_MAX})`}>
          <div className="flex flex-wrap gap-2">
            {ORBIT_HOBBIES.map((t) => {
              const active = draft.hobbies.includes(t);
              const full = draft.hobbies.length >= ORBIT_HOBBY_MAX;
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={active}
                  disabled={!active && full}
                  onClick={() =>
                    set(
                      "hobbies",
                      active ? draft.hobbies.filter((x) => x !== t) : [...draft.hobbies, t],
                    )
                  }
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all active:scale-95 disabled:opacity-40 ${
                    active ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <p className="pt-2 text-[11px] text-muted-foreground">
            {draft.hobbies.length}/{ORBIT_HOBBY_MAX} selected
          </p>
        </Field>

        <Field label="About">
          <Textarea
            value={draft.about}
            maxLength={300}
            rows={5}
            onChange={(e) => set("about", e.target.value)}
            placeholder="A little about you"
            className="min-h-28 rounded-xl leading-relaxed"
          />
          <p className="pt-1 text-right text-[11px] text-muted-foreground">
            {draft.about.length}/300
          </p>
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
            onClick={async () => {
              orbit.saveProfile(draft);
              const { data } = await supabase.auth.getUser();
              if (data.user) {
                toast.success("Orbit Profile created — all features unlocked");
              } else {
                toast.warning("Saved on this device — sign in so others can find your Orbit ID");
              }
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