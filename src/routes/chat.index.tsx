import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  Search,
  PenSquare,
  Users,
  X,
  Trash2,
  Archive,
  BellOff,
  MailOpen,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { YwAvatar } from "@/components/yw/Avatar";
import { byId, threads } from "@/lib/yw-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const [items, setItems] = useState(threads);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const count = selectedIds.length;

  const exitSelect = () => {
    setSelectMode(false);
    setSelected({});
  };

  const toggle = (id: string) =>
    setSelected((p) => {
      const next = { ...p, [id]: !p[id] };
      if (!next[id]) delete next[id];
      return next;
    });

  const startPress = (id: string) => {
    longPressed.current = false;
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      setSelectMode(true);
      setSelected((p) => ({ ...p, [id]: true }));
    }, 450);
  };

  const endPress = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  const runAction = (label: string) => {
    if (label === "Delete") {
      setItems((p) => p.filter((t) => !selected[t.id]));
      toast(`${count} chat${count === 1 ? "" : "s"} deleted`);
    } else if (label === "Mark Read/Unread") {
      setItems((p) => p.map((t) => (selected[t.id] ? { ...t, unread: t.unread ? 0 : 1 } : t)));
      toast("Updated read status");
    } else {
      toast(`${label} · ${count} chat${count === 1 ? "" : "s"}`);
    }
    exitSelect();
  };

  return (
    <main>
      <header className="sticky top-0 z-40 border-b border-border glass px-4 py-3">
        {selectMode ? (
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
            <button aria-label="Exit selection" onClick={exitSelect} className="p-1">
              <X className="h-5 w-5" />
            </button>
            <h1 className="truncate font-display text-lg font-bold">
              {count} selected
            </h1>
          </div>
        ) : (
          <>
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
          </>
        )}
      </header>

      <ul className="divide-y divide-border">
        {items.map((t) => {
          const lead = byId(t.userIds[0]);
          const isSel = !!selected[t.id];
          return (
            <li key={t.id}>
              <Link
                to="/chat/$threadId"
                params={{ threadId: t.id }}
                onPointerDown={() => startPress(t.id)}
                onPointerUp={endPress}
                onPointerLeave={endPress}
                onContextMenu={(e) => e.preventDefault()}
                onClick={(e) => {
                  if (selectMode || longPressed.current) {
                    e.preventDefault();
                    if (selectMode) toggle(t.id);
                  }
                }}
                className={cn(
                  "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors active:bg-secondary",
                  isSel && "bg-secondary",
                )}
              >
                <span className="relative shrink-0">
                  <YwAvatar user={lead} size={52} />
                  {selectMode && (
                    <span
                      className={cn(
                        "absolute -left-1 -top-1 grid h-5 w-5 place-items-center rounded-full ring-2 ring-background",
                        isSel ? "brand-gradient" : "bg-secondary",
                      )}
                    >
                      {isSel && <Check className="h-3 w-3 text-primary-foreground" />}
                    </span>
                  )}
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

      {selectMode && count > 0 && (
        <div className="safe-bottom fixed inset-x-0 bottom-[4.75rem] z-50 mx-3 grid grid-cols-4 gap-1 rounded-2xl border border-border/60 bg-background/85 p-2 shadow-2xl backdrop-blur-xl animate-rise">
          {[
            { icon: Trash2, label: "Delete" },
            { icon: Archive, label: "Archive" },
            { icon: BellOff, label: "Mute" },
            { icon: MailOpen, label: "Mark Read/Unread" },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              onClick={() => runAction(label)}
              className="flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors hover:bg-foreground/10"
            >
              <Icon strokeWidth={1.7} className="h-[18px] w-[18px]" />
              <span className="truncate">{label === "Mark Read/Unread" ? "Read/Unread" : label}</span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}