import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { YwAvatar } from "@/components/yw/Avatar";
import { byId, currentUser, moments, type Moment } from "@/lib/yw-data";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useMoments } from "@/lib/moment-store";

export function Stories() {
  const [open, setOpen] = useState<Moment | null>(null);
  const { moments: myMoments } = useMoments();

  return (
    <>
      <div className="no-scrollbar flex gap-3.5 overflow-x-auto px-4 pb-4 pt-4">
        <Link
          to="/moment/create"
          aria-label="Create your moment"
          className="group flex w-[54px] shrink-0 flex-col items-center gap-2 transition-transform duration-300 active:scale-[0.92]"
        >
          <span className="relative block">
            <span
              className={cn(
                "grid h-[54px] w-[54px] place-items-center rounded-full p-[2px] transition-colors duration-300",
                myMoments.length > 0
                  ? "ring-live"
                  : "border border-dashed border-foreground/18 group-hover:border-foreground/35",
              )}
            >
              <YwAvatar user={currentUser} size={46} />
            </span>
            <span className="glow absolute bottom-0 right-0 grid h-4 w-4 place-items-center rounded-full brand-gradient ring-2 ring-background">
              <Plus className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
            </span>
          </span>
          <span className="w-full truncate text-center font-ui text-[10.5px] font-medium leading-none tracking-[-0.01em] text-muted-foreground">
            Your moment
          </span>
        </Link>

        {myMoments.map((m) => (
          <Link
            key={m.id}
            to="/moment/$momentId"
            params={{ momentId: m.id }}
            className="flex w-[54px] shrink-0 flex-col items-center gap-2 transition-transform duration-300 active:scale-[0.92]"
          >
            <span className="ring-live grid h-[54px] w-[54px] place-items-center rounded-full p-[2px]">
              <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-background p-[2px]">
                {m.kind === "text" || !m.media ? (
                  <span
                    className="grid h-full w-full place-items-center rounded-full text-[9px] font-bold text-white"
                    style={{ background: m.textBg }}
                  >
                    Aa
                  </span>
                ) : m.kind === "video" ? (
                  <video src={m.media} muted className="h-full w-full rounded-full object-cover" />
                ) : (
                  <img src={m.media} alt="Your moment" className="h-full w-full rounded-full object-cover" />
                )}
              </span>
            </span>
            <span className="w-full truncate text-center font-ui text-[10.5px] font-medium leading-none tracking-[-0.01em] text-foreground/90">
              You
            </span>
          </Link>
        ))}

        {moments.map((m, i) => {
          const u = byId(m.userId);
          return (
            <button
              key={m.id}
              onClick={() => setOpen(m)}
              style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
              className="animate-rise flex w-[54px] shrink-0 flex-col items-center gap-2 transition-transform duration-300 active:scale-[0.92]"
            >
              <span
                className={cn(
                  "grid h-[54px] w-[54px] place-items-center rounded-full p-[2px] transition-all duration-300",
                  m.seen
                    ? "bg-foreground/10"
                    : "ring-live shadow-[0_6px_20px_-10px_oklch(0.68_0.245_356/0.9)]",
                )}
              >
                <span className="grid h-full w-full place-items-center rounded-full bg-background p-[2px]">
                  <YwAvatar user={u} size={46} />
                </span>
              </span>
              <span
                className={cn(
                  "w-full truncate text-center font-ui text-[10.5px] font-medium leading-none tracking-[-0.01em]",
                  m.seen ? "text-muted-foreground/80" : "text-foreground/90",
                )}
              >
                {u.username}
              </span>
            </button>
          );
        })}
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-md overflow-hidden border-0 bg-black p-0 sm:rounded-3xl">
          <DialogTitle className="sr-only">Moment</DialogTitle>
          {open && (
            <div className="relative aspect-9/16 w-full">
              <img
                src={open.image}
                alt={`Moment from ${byId(open.userId).username}`}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 top-0 p-3">
                <div className="h-0.5 w-full overflow-hidden rounded-full bg-foreground/25">
                  <div className="h-full w-1/3 rounded-full bg-foreground" />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <YwAvatar user={byId(open.userId)} size={32} />
                  <span className="text-sm font-semibold text-foreground drop-shadow">
                    @{byId(open.userId).username}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}