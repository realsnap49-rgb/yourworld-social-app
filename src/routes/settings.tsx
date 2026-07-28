import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

const groups: { title: string; items: string[] }[] = [
  { title: "Account", items: ["Account", "Privacy & downloads", "Blocked accounts"] },
  { title: "Preferences", items: ["Notifications", "Appearance", "Language"] },
  { title: "Support", items: ["Help centre", "About YourWorld", "Log out"] },
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

      <div className="space-y-6 px-4 pt-5">
        {groups.map((group) => (
          <section key={group.title}>
            <h2 className="pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.title}
            </h2>
            <ul className="overflow-hidden rounded-2xl bg-secondary">
              {group.items.map((item) => (
                <li key={item}>
                  <button className="flex w-full items-center justify-between border-b border-border px-4 py-3.5 text-sm last:border-0">
                    <span>{item}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}