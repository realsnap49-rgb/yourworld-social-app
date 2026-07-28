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
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 px-3 pt-2">
      <ul className="nav-dock relative mx-auto grid max-w-md grid-cols-5 items-end rounded-[26px] px-1.5 py-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          const isCreate = to === "/create";

          if (isCreate) {
            return (
              <li key={to} className="relative flex justify-center">
                <Link
                  to="/create"
                  aria-label="Create"
                  className="fab-create -mt-7 grid h-[52px] w-[52px] place-items-center rounded-[18px] transition-transform duration-200 active:scale-90"
                >
                  <Icon className="h-[22px] w-[22px] text-primary-foreground" strokeWidth={2.4} />
                </Link>
              </li>
            );
          }

          return (
            <li key={to} className="flex justify-center">
              <Link
                to={to}
                aria-label={label}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-[16px] px-3 py-1.5 transition-all duration-300 active:scale-90",
                  active && "nav-pill",
                )}
              >
                <Icon
                  className={cn(
                    "h-[21px] w-[21px] transition-colors duration-300",
                    active ? "text-foreground" : "text-muted-foreground/70",
                  )}
                  strokeWidth={active ? 2 : 1.6}
                />
                <span
                  className={cn(
                    "font-ui text-[9.5px] font-medium tracking-[0.01em] transition-colors duration-300",
                    active ? "text-foreground" : "text-muted-foreground/70",
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