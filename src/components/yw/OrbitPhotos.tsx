import { useRef } from "react";
import { Plus, X, Lock, Camera, Sparkles, Wand2 } from "lucide-react";
import {
  ORBIT_PHOTO_MAX,
  type OrbitPhoto,
  type OrbitPhotoPrivacy,
  type OrbitPhotoStyle,
} from "@/lib/orbit-store";

const STYLES: { id: OrbitPhotoStyle; emoji: string; label: string }[] = [
  { id: "real", emoji: "📸", label: "Real Photo" },
  { id: "avatar", emoji: "🎨", label: "Avatar / AI Photo" },
  { id: "stylized", emoji: "😎", label: "Stylized Photo" },
];

const PRIVACY: { id: OrbitPhotoPrivacy; label: string; hint: string }[] = [
  { id: "everyone", label: "Everyone", hint: "Anyone in Orbit can see your original photo." },
  { id: "matched", label: "Only Matched Users", hint: "Visible after you match with someone." },
  { id: "permission", label: "Only with My Permission", hint: "Each request is approved by you." },
];

const STYLE_ICON = { real: Camera, avatar: Wand2, stylized: Sparkles } as const;

export function OrbitPhotos({
  photos,
  privacy,
  onChange,
  onPrivacyChange,
}: {
  photos: OrbitPhoto[];
  privacy: OrbitPhotoPrivacy;
  onChange: (photos: OrbitPhoto[]) => void;
  onPrivacyChange: (p: OrbitPhotoPrivacy) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const full = photos.length >= ORBIT_PHOTO_MAX;

  const add = (files: FileList | null) => {
    if (!files?.length) return;
    const room = ORBIT_PHOTO_MAX - photos.length;
    const next = Array.from(files)
      .slice(0, room)
      .map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url: URL.createObjectURL(f),
        style: "real" as OrbitPhotoStyle,
      }));
    onChange([...photos, ...next]);
  };

  const remove = (id: string) => onChange(photos.filter((p) => p.id !== id));
  const setStyle = (id: string, style: OrbitPhotoStyle) =>
    onChange(photos.map((p) => (p.id === id ? { ...p, style } : p)));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2.5">
        {photos.map((p, i) => {
          const Icon = STYLE_ICON[p.style];
          return (
            <div
              key={p.id}
              className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-secondary"
            >
              <img src={p.url} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-background/75 px-2 py-0.5 text-[10px] font-medium backdrop-blur">
                  Main
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label="Remove photo"
                className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-background/75 backdrop-blur transition-transform active:scale-90"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.9} />
              </button>
              <div className="absolute inset-x-1.5 bottom-1.5 flex items-center gap-1 rounded-full bg-background/70 px-1.5 py-1 backdrop-blur">
                <Icon className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.8} />
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={s.label}
                    aria-pressed={p.style === s.id}
                    onClick={() => setStyle(p.id, s.id)}
                    className={`grid h-5 flex-1 place-items-center rounded-full text-[11px] transition-all active:scale-90 ${
                      p.style === s.id ? "bg-foreground/90" : "opacity-45"
                    }`}
                  >
                    <span aria-hidden>{s.emoji}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {!full && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="grid aspect-[3/4] place-items-center rounded-2xl border border-dashed border-border bg-secondary/40 text-muted-foreground transition-transform active:scale-95"
          >
            <span className="flex flex-col items-center gap-1">
              <Plus className="h-5 w-5" strokeWidth={1.8} />
              <span className="text-[11px]">Add photo</span>
            </span>
          </button>
        )}
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />

      <p className="text-[11px] text-muted-foreground">
        At least 1 photo is required · {photos.length}/{ORBIT_PHOTO_MAX} added. Tap the icons on a
        photo to set its style.
      </p>

      <div className="rounded-2xl bg-secondary/50 p-3.5">
        <p className="flex items-center gap-1.5 text-xs font-semibold">
          <Lock className="h-3.5 w-3.5" strokeWidth={1.9} />
          Original Photo Privacy
        </p>
        <p className="pt-1 text-[11px] text-muted-foreground">
          Choose who can view your original photo.
        </p>
        <div className="space-y-1.5 pt-3">
          {PRIVACY.map((o) => {
            const active = privacy === o.id;
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={active}
                onClick={() => onPrivacyChange(o.id)}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all active:scale-[0.99] ${
                  active ? "bg-foreground text-background" : "bg-background/60"
                }`}
              >
                <span
                  className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                    active ? "border-background" : "border-border"
                  }`}
                >
                  {active && <span className="h-2 w-2 rounded-full bg-background" />}
                </span>
                <span>
                  <span className="block text-sm font-medium">{o.label}</span>
                  <span
                    className={`block text-[11px] ${active ? "opacity-70" : "text-muted-foreground"}`}
                  >
                    {o.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}