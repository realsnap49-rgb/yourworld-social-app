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

  // The Create camera is full-screen and has its own mode selector.
  if (pathname.startsWith("/create")) return null;

  // Bottom nav is only for the main app screens.
  const isMainScreen =
    pathname === "/" ||
    items.some(({ to }) => to !== "/" && pathname.startsWith(to));
  if (!isMainScreen) return null;

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 px-4 pt-2">
      <ul className="nav-dock relative mx-auto grid max-w-[320px] grid-cols-5 items-center rounded-[22px] px-1 py-1">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          const isCreate = to === "/create";

          if (isCreate) {
            return (
              <li key={to} className="relative flex justify-center">
                <Link
                  to="/create"
                  aria-label="Create"
                  className="fab-create grid h-[40px] w-[40px] place-items-center rounded-[13px] transition-transform duration-200 active:scale-90"
                >
                  <Icon className="h-5 w-5 text-primary-foreground" strokeWidth={2.4} />
                </Link>
              </li>
            );
          }

          return (
            <li key={to} className="flex justify-center px-0.5">
              <Link
                to={to}
                aria-label={label}
                className={cn(
                  "flex w-full flex-col items-center gap-1 rounded-[14px] px-1 py-1.5 transition-all duration-300 active:scale-90",
                  active && "nav-pill",
                )}
              >
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] transition-colors duration-300",
                    active ? "text-foreground" : "text-muted-foreground/70",
                  )}
                  strokeWidth={active ? 2 : 1.6}
                />
                <span
                  className={cn(
                    "font-ui text-[9px] font-medium leading-none tracking-[0.01em] transition-colors duration-300",
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