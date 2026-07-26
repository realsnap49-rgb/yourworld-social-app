import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { YwAvatar } from "@/components/yw/Avatar";
import { byId, currentUser, moments, type Moment } from "@/lib/yw-data";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

export function Stories() {
  const [open, setOpen] = useState<Moment | null>(null);

  return (
    <>
      <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 py-3">
        <button className="flex w-16 shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-95">
          <span className="relative">
            <YwAvatar user={currentUser} size={64} className="ring-2 ring-border" />
            <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full brand-gradient ring-2 ring-background">
              <Plus className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
            </span>
          </span>
          <span className="w-full truncate text-[11px] text-muted-foreground">Your moment</span>
        </button>

        {moments.map((m) => {
          const u = byId(m.userId);
          return (
            <button
              key={m.id}
              onClick={() => setOpen(m)}
              className="flex w-16 shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-95"
            >
              <span
                className={cn(
                  "grid h-[68px] w-[68px] place-items-center rounded-full p-[2.5px]",
                  m.seen ? "bg-secondary" : "ring-story",
                )}
              >
                <span className="grid h-full w-full place-items-center rounded-full bg-background p-[2px]">
                  <YwAvatar user={u} size={58} />
                </span>
              </span>
              <span className="w-full truncate text-[11px] text-muted-foreground">
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
                <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/25">
                  <div className="h-full w-1/3 rounded-full bg-white" />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <YwAvatar user={byId(open.userId)} size={32} />
                  <span className="text-sm font-semibold text-white drop-shadow">
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