import { useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, Clapperboard, Plus, MessageCircle, User, Image as ImageIcon, Radio } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/reels", label: "Reels", icon: Clapperboard },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (pathname.startsWith("/create")) return null;

  const go = (mode: "POST" | "REEL" | "LIVE") => {
    setOpen(false);
    navigate({ to: "/create", search: { mode } });
  };

  return (
    <>
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
        {items.map((item, i) => {
          const Icon = item.icon;
          const isActive = pathname === item.to;
          const link = (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground",
                isActive && "text-foreground font-medium"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
          if (i !== 2) return link;
          return (
            <div key="create-slot" className="contents">
              <button
                type="button"
                aria-label="Create"
                onClick={() => setOpen(true)}
                className="flex flex-col items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Plus className="h-5 w-5" />
                <span>Create</span>
              </button>
              {link}
            </div>
          );
        })}
      </div>
    </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl border-border/60">
          <SheetHeader className="text-left">
            <SheetTitle>Create</SheetTitle>
          </SheetHeader>
          <div className="grid gap-2 pb-6">
            {[
              { mode: "POST" as const, label: "Post", desc: "Photo or video for your feed", icon: ImageIcon },
              { mode: "REEL" as const, label: "Reel", desc: "Short vertical video", icon: Clapperboard },
              { mode: "LIVE" as const, label: "Live", desc: "Go live with your followers", icon: Radio },
            ].map((o) => (
              <button
                key={o.mode}
                type="button"
                onClick={() => go(o.mode)}
                className="flex items-center gap-3 rounded-2xl bg-muted/40 p-3 text-left transition-colors hover:bg-muted/70"
              >
                <span className="grid size-10 place-items-center rounded-full bg-background">
                  <o.icon className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{o.label}</span>
                  <span className="block text-xs text-muted-foreground">{o.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
