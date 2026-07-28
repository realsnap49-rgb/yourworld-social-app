import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  User,
  Megaphone,
  FileText,
  Globe2,
  Lock,
  Bell,
  Palette,
  HelpCircle,
  Info,
  LogOut,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — YourWorld" },
      {
        name: "description",
        content:
          "Manage your YourWorld account, privacy, notifications and appearance preferences.",
      },
      { property: "og:title", content: "Settings — YourWorld" },
      {
        property: "og:description",
        content: "Account, privacy, notifications and appearance settings on YourWorld.",
      },
    ],
  }),
  component: SettingsPage,
});

type Item = { label: string; hint?: string; icon: LucideIcon; danger?: boolean; to?: string };

const items: Item[] = [
  { label: "Account", icon: User },
  { label: "Create Channel", icon: Megaphone },
  { label: "Create Page", icon: FileText },
  { label: "Orbit", hint: "Private social discovery", icon: Globe2, to: "/orbit" },
  { label: "Privacy & Downloads", hint: "Blocked accounts", icon: Lock },
  { label: "Notifications", icon: Bell },
  { label: "Appearance", icon: Palette },
  { label: "Help & Support", icon: HelpCircle },
  { label: "About", icon: Info },
  { label: "Log Out", icon: LogOut, danger: true },
];

function SettingsPage() {
  return (
    <main className="min-h-screen pb-10">
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-border glass px-3 py-3">
        <Link
          to="/profile"
          aria-label="Back to profile"
          className="grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
        </Link>
        <h1 className="font-display text-lg font-bold">Settings</h1>
      </header>

      <div className="px-4 pt-5">
        <ul className="surface-card overflow-hidden rounded-3xl">
          {items.map((item, i) => {
            const inner = (
              <>
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                    item.danger ? "bg-destructive/15 text-destructive" : "chip"
                  }`}
                >
                  <item.icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm font-medium ${item.danger ? "text-destructive" : ""}`}
                  >
                    {item.label}
                  </span>
                  {item.hint ? (
                    <span className="block truncate text-xs text-muted-foreground">{item.hint}</span>
                  ) : null}
                </span>
                {!item.danger && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
              </>
            );
            const cls =
              "flex w-full items-center gap-3.5 border-b border-border px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)] active:bg-[color-mix(in_oklab,var(--foreground)_9%,transparent)]";
            return (
              <li key={item.label} className="animate-rise" style={{ animationDelay: `${i * 28}ms` }}>
                {item.to ? (
                  <Link to={item.to} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <button className={cls}>{inner}</button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}