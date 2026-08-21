import { useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Pencil, MapPin, ImagePlus, Video, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOrbit, ORBIT_PHOTO_MAX, type OrbitPhoto } from "@/lib/orbit-store";
import { moodById } from "@/lib/orbit-mood";

export const Route = createFileRoute("/orbit/me")({
  head: () => ({
    meta: [
      { title: "My Orbit Profile — YourWorld" },
      {
        name: "description",
        content:
          "See your own Orbit profile exactly as others do, edit your details, and add photos or an intro video.",
      },
      { property: "og:title", content: "My Orbit Profile — YourWorld" },
      {
        property: "og:description",
        content: "View and edit your Orbit profile, photos and intro video.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrbitMyProfile,
});

function OrbitMyProfile() {
  const orbit = useOrbit();
  const navigate = useNavigate();
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const p = orbit.profile;

  if (!p) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-sm text-muted-foreground">
            You don&apos;t have an Orbit profile yet.
          </p>
          <Link
            to="/orbit/create"
            className="mt-4 inline-block rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background"
          >
            Create Orbit Profile
          </Link>
        </div>
      </main>
    );
  }

  const mood = moodById(p.mood ?? undefined);
  const cover = p.photos.find((m) => m.kind !== "video");
  const videos = p.photos.filter((m) => m.kind === "video");

  const addMedia = (files: FileList | null, kind: "photo" | "video") => {
    if (!files?.length) return;
    const room = ORBIT_PHOTO_MAX - p.photos.length;
    if (room <= 0) {
      toast.warning(`You can keep up to ${ORBIT_PHOTO_MAX} items.`);
      return;
    }
    const next: OrbitPhoto[] = Array.from(files)
      .slice(0, room)
      .map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url: URL.createObjectURL(f),
        style: "real",
        kind,
      }));
    orbit.saveProfile({ ...p, photos: [...p.photos, ...next] });
    toast.success(kind === "video" ? "Video added to your Orbit profile" : "Photo added");
  };

  const removeMedia = (id: string) => {
    orbit.saveProfile({ ...p, photos: p.photos.filter((m) => m.id !== id) });
    toast.success("Removed");
  };

  return (
    <main className="min-h-screen pb-16">
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-border glass px-3 py-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/orbit" })}
          aria-label="Back to Orbit feed"
          className="grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
        </button>
        <h1 className="font-display text-lg font-bold">My Orbit Profile</h1>
        <Link
          to="/orbit/create"
          aria-label="Edit Orbit profile"
          className="ml-auto flex items-center gap-1.5 rounded-full chip px-3 py-1.5 text-xs font-semibold transition-transform active:scale-95"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.9} />
          Edit
        </Link>
      </header>

      <div className="relative aspect-[4/5] w-full overflow-hidden bg-secondary">
        {cover ? (
          <img src={cover.url} alt={`${p.name}'s Orbit photo`} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-sm text-muted-foreground">
            No photo yet
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,oklch(0.12_0.02_290/0.92),transparent)] p-5 pt-20">
          <h2 className="font-display text-2xl font-bold">
            {p.name}
            {p.age ? `, ${p.age}` : ""}
          </h2>
          {mood && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-background/60 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
              <span aria-hidden>{mood.emoji}</span>
              {mood.label}
            </span>
          )}
          {(p.city || p.country) && (
            <p className="flex items-center gap-1 pt-1.5 text-xs text-muted-foreground/90">
              <MapPin className="h-3.5 w-3.5" strokeWidth={1.8} />
              {[p.city, p.country].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>

      <section className="space-y-6 px-5 pt-5">
        {p.about && (
          <p className="text-sm leading-relaxed text-muted-foreground">{p.about}</p>
        )}

        {p.hobbies.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {p.hobbies.map((t) => (
              <span key={t} className="chip rounded-full px-3 py-1 text-[11px] font-medium">
                {t}
              </span>
            ))}
          </div>
        )}

        {p.lookingFor && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
            Looking for: <span className="font-medium text-foreground">{p.lookingFor}</span>
          </p>
        )}

        <div>
          <div className="flex items-center justify-between pb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Photos & Video
            </p>
            <p className="text-[11px] text-muted-foreground">
              {p.photos.length}/{ORBIT_PHOTO_MAX}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {p.photos.map((m) => (
              <div
                key={m.id}
                className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-secondary"
              >
                {m.kind === "video" ? (
                  <video src={m.url} muted playsInline controls className="h-full w-full object-cover" />
                ) : (
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(m.id)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-background/75 px-2 py-0.5 text-[10px] font-semibold backdrop-blur transition-transform active:scale-90"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3">
            <Button
              variant="secondary"
              className="h-11 rounded-full"
              onClick={() => photoInput.current?.click()}
            >
              <ImagePlus className="mr-1.5 h-4 w-4" strokeWidth={1.8} />
              Add photo
            </Button>
            <Button
              variant="secondary"
              className="h-11 rounded-full"
              onClick={() => videoInput.current?.click()}
            >
              <Video className="mr-1.5 h-4 w-4" strokeWidth={1.8} />
              Add video
            </Button>
          </div>

          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              addMedia(e.target.files, "photo");
              e.target.value = "";
            }}
          />
          <input
            ref={videoInput}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => {
              addMedia(e.target.files, "video");
              e.target.value = "";
            }}
          />

          {videos.length === 0 && (
            <p className="pt-2 text-[11px] text-muted-foreground">
              Add a short intro video so people get a real feel for you.
            </p>
          )}
        </div>

        <Button className="h-11 w-full rounded-full" onClick={() => navigate({ to: "/orbit/create" })}>
          Edit profile details
        </Button>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          This is exactly how your Orbit profile appears to others — only your approximate area is
          ever shown.
        </p>
      </section>
    </main>
  );
}
