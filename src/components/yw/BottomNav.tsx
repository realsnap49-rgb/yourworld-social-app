import { useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Clapperboard,
  Plus,
  MessageCircle,
  User,
  Camera,
  Type,
  SquarePen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/reels", label: "Reels", icon: Clapperboard },
  { to: "/create", label: "Create", icon: Plus },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: User },
] as const;

const quickActions = [
  { to: "/create", label: "Camera", icon: Camera },
  { to: "/create", label: "Text", icon: Type },
  { to: "/create", label: "Edit", icon: SquarePen },
  { to: "/chat", label: "Chat", icon: MessageCircle },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const longPress = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPress = () => {
    longPress.current = false;
    timer.current = setTimeout(() => {
      longPress.current = true;
      setOpen(false);
      navigate({ to: "/create" });
    }, 450);
  };
  const endPress = () => {
    if (timer.current) clearTimeout(timer.current);
  };

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 px-3 pt-2">
      {open && (
        <button
          aria-label="Close quick actions"
          onClick={() => setOpen(false)}
          className="fixed inset-0 -z-10 cursor-default bg-background/45 backdrop-blur-[2px]"
        />
      )}
      <ul className="nav-dock relative mx-auto grid max-w-md grid-cols-5 items-end rounded-[26px] px-1.5 py-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          const isCreate = to === "/create";

          if (isCreate) {
            return (
              <li key={to} className="relative flex justify-center">
                {open && (
                  <div className="absolute bottom-[74px] left-1/2 flex -translate-x-1/2 items-end gap-2.5">
                    {quickActions.map((q, i) => (
                      <Link
                        key={q.label}
                        to={q.to}
                        aria-label={q.label}
                        onClick={() => setOpen(false)}
                        style={{ animationDelay: `${i * 45}ms` }}
                        className="animate-rise nav-dock grid h-[46px] w-[46px] place-items-center rounded-[16px] transition-transform duration-200 active:scale-90"
                      >
                        <q.icon className="h-[19px] w-[19px] text-foreground" strokeWidth={1.7} />
                      </Link>
                    ))}
                  </div>
                )}
                <button
                  aria-label="Quick actions"
                  aria-expanded={open}
                  onPointerDown={startPress}
                  onPointerUp={endPress}
                  onPointerLeave={endPress}
                  onClick={() => {
                    if (longPress.current) return;
                    setOpen((v) => !v);
                  }}
                  className="fab-create -mt-7 grid h-[52px] w-[52px] place-items-center rounded-[18px]"
                >
                  <Icon
                    className={cn(
                      "h-[22px] w-[22px] text-primary-foreground transition-transform duration-300",
                      open && "rotate-45",
                    )}
                    strokeWidth={2.4}
                  />
                </button>
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