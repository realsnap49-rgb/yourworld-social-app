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
    <nav className="safe-bottom nav-dock fixed inset-x-0 bottom-0 z-50">
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-2 pt-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          const isCreate = to === "/create";
          return (
            <li key={to} className="flex justify-center">
              <Link
                to={to}
                aria-label={label}
                className="flex flex-col items-center gap-1.5 px-2 pb-1 pt-1 transition-transform duration-200 active:scale-90"
              >
                {isCreate ? (
                  <span className="glow grid h-9 w-[46px] place-items-center rounded-[14px] brand-gradient">
                    <Icon className="h-[18px] w-[18px] text-primary-foreground" strokeWidth={2.6} />
                  </span>
                ) : (
                  <Icon
                    className={cn(
                      "h-[22px] w-[22px] transition-colors duration-200",
                      active ? "text-foreground" : "text-muted-foreground/80",
                    )}
                    strokeWidth={active ? 2.2 : 1.7}
                  />
                )}
                <span
                  className={cn(
                    "font-ui text-[10px] font-medium tracking-[-0.01em] transition-colors duration-200",
                    active ? "text-foreground" : "text-muted-foreground/80",
                  )}
                >
                  {label}
                </span>
                <span
                  className={cn(
                    "h-[3px] w-[3px] rounded-full transition-all duration-300",
                    active && !isCreate ? "nav-active-dot" : "bg-transparent",
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}