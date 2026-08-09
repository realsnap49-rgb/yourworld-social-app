import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Camera, Plus, Eye, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMoments } from "@/lib/moment-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/moment/")({
  head: () => ({
    meta: [
      { title: "Your Moments — YourWorld" },
      {
        name: "description",
        content:
          "Browse the moments you shared, check views and likes, revisit your archive or capture a new moment.",
      },
      { property: "og:title", content: "Your Moments — YourWorld" },
      {
        property: "og:description",
        content: "Your live moments, archive, views and likes in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MomentsIndex,
});

function MomentsIndex() {
  const navigate = useNavigate();
  const { moments, archive } = useMoments();

  return (
    <div className="min-h-dvh bg-background pb-28">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl">
        <button
          aria-label="Back"
          onClick={() => navigate({ to: "/" })}
          className="grid size-9 place-items-center rounded-full bg-muted/40"
        >
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-base font-semibold">Your Moments</h1>
        <Link to="/moment/create" className="ml-auto">
          <Button size="sm" className="rounded-full gap-1.5">
            <Plus className="size-4" /> New
          </Button>
        </Link>
      </header>

      <main className="px-4 pt-4">
        {moments.length === 0 && archive.length === 0 ? (
          <div className="mt-24 flex flex-col items-center text-center">
            <div className="grid size-20 place-items-center rounded-full bg-muted/40">
              <Camera className="size-8 text-muted-foreground" />
            </div>
            <h2 className="mt-5 text-lg font-semibold">No moments yet</h2>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Capture something and it will show up here for 12 or 24 hours.
            </p>
            <Link to="/moment/create" className="mt-6">
              <Button className="rounded-full px-6">Create a moment</Button>
            </Link>
          </div>
        ) : (
          <>
            <Section title="Live now" items={moments} />
            <Section title="Archive" items={archive} muted />
          </>
        )}
      </main>
    </div>
  );
}

function Section({
  title,
  items,
  muted,
}: {
  title: string;
  items: ReturnType<typeof useMoments>["moments"];
  muted?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{title}</h2>
      <div className="grid grid-cols-3 gap-2">
        {items.map((m) => (
          <Link
            key={m.id}
            to="/moment/$momentId"
            params={{ momentId: m.id }}
            className={cn(
              "relative aspect-[9/16] overflow-hidden rounded-2xl bg-muted/40",
              muted && "opacity-70",
            )}
          >
            {m.kind === "video" ? (
              <video src={m.media} muted playsInline className="size-full object-cover" />
            ) : m.kind === "photo" ? (
              <img src={m.media} alt="" className="size-full object-cover" />
            ) : (
              <div
                className="grid size-full place-items-center p-2 text-center text-xs font-medium"
                style={{ background: m.textBg }}
              >
                {m.text}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/70 to-transparent p-2 text-[11px] text-white">
              <span className="flex items-center gap-1">
                <Eye className="size-3" />
                {m.viewers.length}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="size-3" />
                {m.viewers.filter((v) => v.liked).length}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}