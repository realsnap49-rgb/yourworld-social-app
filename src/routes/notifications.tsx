import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { markAlertsSeen } from "@/lib/alerts-count";
import { CheckCheck, ChevronLeft, Radio, Settings2, X } from "lucide-react";
import {
  NOTIFICATION_KINDS,
  ORBIT_KINDS,
  kindMeta,
  timeAgo,
  useNotifications,
  type NotificationKind,
} from "@/lib/notifications-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — YourWorld" },
      {
        name: "description",
        content:
          "Real-time likes, comments, followers, Orbit matches, messages, channel, verification and monetization alerts on YourWorld.",
      },
      { property: "og:title", content: "Notifications — YourWorld" },
      {
        property: "og:description",
        content: "Every YourWorld alert in one premium, real-time activity feed.",
      },
    ],
  }),
  component: NotificationsPage,
});

type Filter = "all" | "unread" | NotificationKind;

function NotificationsPage() {
  useEffect(() => {
    markAlertsSeen();
  }, []);

  const {
    items: allItems,
    unreadHome: unread,
    unreadByKind,
    prefs,
    live,
    setLive,
    setPref,
    markRead,
    markAllRead,
    remove,
  } =
    useNotifications();
  const [filter, setFilter] = useState<Filter>("all");
  const [tuning, setTuning] = useState(false);
  const navigate = useNavigate();

  /** Orbit, Connections and Matches live only inside the Orbit section.
   *  Message alerts are hidden here — they already live in the Chats inbox. */
  const items = useMemo(
    () => allItems.filter((i) => !ORBIT_KINDS.includes(i.kind) && i.kind !== "message"),
    [allItems],
  );
  const homeKinds = useMemo(
    () => NOTIFICATION_KINDS.filter((k) => !ORBIT_KINDS.includes(k.id) && k.id !== "message"),
    [],
  );

  const list = useMemo(() => {
    const base =
      filter === "all" ? items : filter === "unread" ? items.filter((i) => !i.read) : items.filter((i) => i.kind === filter);
    return [...base].sort((a, b) => b.at - a.at);
  }, [items, filter]);

  return (
    <main className="min-h-screen pb-10">
      <header className="sticky top-0 z-40 border-b border-border glass">
        <div className="flex items-center gap-2 px-3 py-3">
          <Link
            to="/"
            aria-label="Back"
            className="grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-90"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
          </Link>
          <h1 className="font-display text-lg font-bold">Notifications</h1>
          {unread > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
              {unread}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setLive(!live)}
              aria-pressed={live}
              aria-label="Toggle real-time updates"
              className={cn(
                "grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-90",
                live ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Radio className={cn("h-[18px] w-[18px]", live && "animate-pulse")} strokeWidth={1.8} />
            </button>
            <button
              onClick={markAllRead}
              aria-label="Mark all as read"
              className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-transform active:scale-90"
            >
              <CheckCheck className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </button>
            <button
              onClick={() => setTuning((t) => !t)}
              aria-label="Notification preferences"
              aria-expanded={tuning}
              className={cn(
                "grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-90",
                tuning ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <Settings2 className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </button>
          </div>
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 pb-3">
          <Chip active={filter === "all"} onClick={() => setFilter("all")} label="All" />
          <Chip
            active={filter === "unread"}
            onClick={() => setFilter("unread")}
            label="Unread"
            count={unread}
          />
          {homeKinds.filter((k) => prefs[k.id]).map((k) => (
            <Chip
              key={k.id}
              active={filter === k.id}
              onClick={() => setFilter(k.id)}
              label={`${k.emoji} ${k.label}`}
              count={unreadByKind[k.id]}
            />
          ))}
        </div>
      </header>

      {tuning && (
        <section aria-label="Notification types" className="px-4 pt-4">
          <ul className="surface-card overflow-hidden rounded-3xl">
            {homeKinds.map((k) => (
              <li
                key={k.id}
                className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
              >
                <span className="chip grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px]">
                  {k.emoji}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{k.label}</span>
                <button
                  role="switch"
                  aria-checked={prefs[k.id]}
                  aria-label={`${k.label} notifications`}
                  onClick={() => setPref(k.id, !prefs[k.id])}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    prefs[k.id] ? "bg-primary" : "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform",
                      prefs[k.id] ? "translate-x-[22px]" : "translate-x-0.5",
                    )}
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Activity" className="px-3 pt-4">
        {list.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">You're all caught up.</p>
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

function Chip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95",
        active ? "bg-foreground text-background" : "chip text-muted-foreground",
      )}
    >
      {label}
      {count ? <span className="ml-1.5 text-[10px] font-semibold">{count}</span> : null}
    </button>
  );
}
