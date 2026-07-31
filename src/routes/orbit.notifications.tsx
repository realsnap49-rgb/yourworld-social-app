import { useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCheck, ChevronLeft, X } from "lucide-react";
import { ORBIT_KINDS, kindMeta, timeAgo, useNotifications } from "@/lib/notifications-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orbit/notifications")({
  head: () => ({
    meta: [
      { title: "Orbit Notifications — YourWorld" },
      {
        name: "description",
        content:
          "Orbit, connection and match alerts, kept private inside the Orbit section of YourWorld.",
      },
      { property: "og:title", content: "Orbit Notifications — YourWorld" },
      {
        property: "og:description",
        content: "Your Orbit, connection and match alerts in one private place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrbitNotificationsPage,
});

function OrbitNotificationsPage() {
  const { items, unreadOrbit, markRead, markAllRead, remove } = useNotifications();
  const navigate = useNavigate();

  const list = useMemo(
    () =>
      items.filter((i) => ORBIT_KINDS.includes(i.kind)).sort((a, b) => b.at - a.at),
    [items],
  );

  return (
    <main className="min-h-screen pb-10">
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-border glass px-3 py-3">
        <Link
          to="/orbit"
          aria-label="Back to Orbit"
          className="grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
        </Link>
        <h1 className="font-display text-lg font-bold">Orbit Notifications</h1>
        {unreadOrbit > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
            {unreadOrbit}
          </span>
        )}
        <button
          onClick={markAllRead}
          aria-label="Mark all as read"
          className="ml-auto grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-transform active:scale-90"
        >
          <CheckCheck className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </button>
      </header>

      <section aria-label="Orbit activity" className="px-3 pt-4">
        {list.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No Orbit activity yet.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((n, i) => {
              const meta = kindMeta(n.kind);
              const Icon = meta.icon;
              return (
                <li key={n.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 26}ms` }}>
                  <div
                    className={cn(
                      "surface-card flex items-start gap-3 rounded-2xl px-3.5 py-3 transition-colors",
                      !n.read && "bg-[color-mix(in_oklab,var(--primary)_8%,transparent)]",
                    )}
                  >
                    <button
                      onClick={() => {
                        markRead(n.id);
                        if (n.to) navigate({ to: n.to });
                      }}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    >
                      <span className="chip relative grid h-10 w-10 shrink-0 place-items-center rounded-full">
                        <Icon className={cn("h-[18px] w-[18px]", meta.tint)} strokeWidth={1.7} />
                        {!n.read && (
                          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span
                            className={cn(
                              "min-w-0 flex-1 text-sm leading-snug",
                              n.read ? "text-foreground/85" : "font-semibold",
                            )}
                          >
                            {n.title}
                          </span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(n.at)}</span>
                        </span>
                        {n.body && (
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{n.body}</span>
                        )}
                        <span className="mt-1 block text-[10px] uppercase tracking-wide text-muted-foreground/70">
                          {meta.label}
                        </span>
                      </span>
                    </button>
                    <button
                      onClick={() => remove(n.id)}
                      aria-label="Dismiss notification"
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-transform active:scale-90"
                    >
                      <X className="h-4 w-4" strokeWidth={1.8} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
