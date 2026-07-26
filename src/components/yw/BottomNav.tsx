import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Clapperboard, Plus, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/reels", label: "Reels", icon: Clapperboard },
  { to: "/create", label: "Create", icon: Plus },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-border glass">
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-2 pt-1.5">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          const isCreate = to === "/create";
          return (
            <li key={to} className="flex justify-center">
              <Link
                to={to}
                aria-label={label}
                className="flex flex-col items-center gap-1 px-2 py-1.5 transition-transform active:scale-90"
              >
                {isCreate ? (
                  <span className="grid h-9 w-11 place-items-center rounded-xl brand-gradient glow">
                    <Icon className="h-5 w-5 text-primary-foreground" strokeWidth={2.6} />
                  </span>
                ) : (
                  <Icon
                    className={cn(
                      "h-6 w-6 transition-colors",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                    strokeWidth={active ? 2.6 : 1.8}
                  />
                )}
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}