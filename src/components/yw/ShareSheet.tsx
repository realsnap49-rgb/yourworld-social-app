import { useMemo, useState, type ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { YwAvatar } from "@/components/yw/Avatar";
import { users } from "@/lib/yw-data";
import { toast } from "sonner";
import { Search, Link2, MoreHorizontal, Send } from "lucide-react";

const apps = [
  { name: "WhatsApp", color: "#25D366", initials: "WA" },
  { name: "Instagram", color: "#E1306C", initials: "IG" },
  { name: "Snapchat", color: "#FFFC00", initials: "SC", dark: true },
  { name: "Facebook", color: "#1877F2", initials: "FB" },
  { name: "Telegram", color: "#2AABEE", initials: "TG" },
  { name: "X", color: "#111111", initials: "X" },
];

export function ShareSheet({ children, title }: { children: ReactNode; title: string }) {
  const [query, setQuery] = useState("");
  const shareUrl = typeof window !== "undefined" ? window.location.href : "https://yourworld.app";

  const results = useMemo(
    () =>
      users.filter(
        (u) =>
          u.username.toLowerCase().includes(query.toLowerCase()) ||
          u.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );
  const recents = users.slice(0, 4);

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "YourWorld", text: title, url: shareUrl });
        return;
      } catch {
        /* dismissed */
      }
    }
    toast("Sharing isn't available on this device");
  };

  return (
    <Drawer>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="border-border bg-popover">
        <div className="mx-auto w-full max-w-lg pb-8">
          <DrawerHeader className="px-4 pb-2 text-left">
            <DrawerTitle className="font-display text-lg">Share</DrawerTitle>
            <DrawerDescription className="truncate text-xs">{title}</DrawerDescription>
          </DrawerHeader>

          <div className="px-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users"
                className="h-11 rounded-full border-0 bg-secondary pl-9 text-sm"
              />
            </div>
          </div>

          <p className="px-4 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {query ? "Results" : "Recent friends"}
          </p>
          <ul className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-4">
            {(query ? results : recents).map((u) => (
              <li key={u.id} className="w-16 shrink-0 text-center">
                <button
                  onClick={() => toast.success(`Sent to @${u.username}`)}
                  className="flex w-full flex-col items-center gap-1.5 transition-transform active:scale-90"
                >
                  <YwAvatar user={u} size={56} />
                  <span className="w-full truncate text-[11px] text-muted-foreground">
                    @{u.username}
                  </span>
                </button>
              </li>
            ))}
            {query && results.length === 0 && (
              <li className="py-4 text-sm text-muted-foreground">No users found</li>
            )}
          </ul>

          <div className="no-scrollbar flex gap-4 overflow-x-auto border-t border-border px-4 pt-4">
            {apps.map((a) => (
              <button
                key={a.name}
                onClick={() => toast(`Opening ${a.name}…`)}
                className="flex w-16 shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-90"
              >
                <span
                  className="grid h-14 w-14 place-items-center rounded-2xl font-display text-sm font-bold"
                  style={{ backgroundColor: a.color, color: a.dark ? "#111" : "#fff" }}
                >
                  {a.initials}
                </span>
                <span className="w-full truncate text-[11px] text-muted-foreground">{a.name}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 px-4">
            <SheetAction
              icon={<Link2 className="h-5 w-5" />}
              label="Copy link"
              onClick={() => {
                navigator.clipboard?.writeText(shareUrl);
                toast.success("Link copied");
              }}
            />
            <SheetAction icon={<Send className="h-5 w-5" />} label="More apps" onClick={nativeShare} />
            <SheetAction
              icon={<MoreHorizontal className="h-5 w-5" />}
              label="Other"
              onClick={() => toast("More options coming soon")}
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function SheetAction({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-2xl bg-secondary px-2 py-3 text-muted-foreground transition-transform active:scale-95"
    >
      {icon}
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}