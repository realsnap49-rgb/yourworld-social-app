import { memo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Clapperboard, Plus, MessageCircle, User } from "lucide-react";
import { CreateSheet } from "@/components/yw/CreateSheet";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/reels", label: "Reels", icon: Clapperboard },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: User },
] as const;

function BottomNavBase() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  if (pathname.startsWith("/create")) return null;

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

      <CreateSheet open={open} onOpenChange={setOpen} />
    </>
  );
}

export const BottomNav = memo(BottomNavBase);
