import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, PenSquare, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { YwAvatar } from "@/components/yw/Avatar";
import { byId, threads } from "@/lib/yw-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat/")({
  head: () => ({
    meta: [
      { title: "Chat — YourWorld" },
      {
        name: "description",
        content:
          "Personal and group chats on YourWorld with voice messages, photo and video sharing, and read receipts.",
      },
      { property: "og:title", content: "Chat — YourWorld" },
      {
        property: "og:description",
        content: "DMs and group chats with voice notes, media and read receipts.",
      },
    ],
  }),
  component: ChatListPage,
});

function ChatListPage() {
  return (
    <main>
      <header className="sticky top-0 z-40 border-b border-border glass px-4 py-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h1 className="truncate font-display text-xl font-bold">Chats</h1>
          <button aria-label="New chat" className="transition-transform active:scale-90">
            <PenSquare className="h-6 w-6" />
          </button>
        </div>
        <div className="relative pt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 translate-y-0.5 text-muted-foreground" />
          <Input
            placeholder="Search messages"
            className="h-10 rounded-full border-0 bg-secondary pl-9 text-sm"
          />
        </div>
      </header>

      <ul className="divide-y divide-border">
        {threads.map((t) => {
          const lead = byId(t.userIds[0]);
          return (
            <li key={t.id}>
              <Link
                to="/chat/$threadId"
                params={{ threadId: t.id }}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors active:bg-secondary"
              >
                <span className="relative shrink-0">
                  <YwAvatar user={lead} size={52} />
                  {t.kind === "group" && (
                    <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-secondary ring-2 ring-background">
                      <Users className="h-3 w-3 text-muted-foreground" />
                    </span>
                  )}
                  {t.online && (
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-accent ring-2 ring-background" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{t.title}</span>
                  <span
                    className={cn(
                      "block truncate text-xs",
                      t.unread ? "font-semibold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {t.lastMessage}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[11px] text-muted-foreground">{t.lastTime}</span>
                  {t.unread > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full brand-gradient px-1.5 text-[11px] font-bold text-primary-foreground">
                      {t.unread}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}