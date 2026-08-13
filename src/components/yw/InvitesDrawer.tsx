import { Sheet, SheetContent } from "@/components/ui/sheet";
import { inviteOptions, type InviteKind } from "@/lib/orbit-invites";

export function InvitesDrawer({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (kind: InviteKind) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-border/60 p-0 [&>button]:hidden"
      >
        <div className="px-5 pb-8 pt-5">
          <h2 className="font-display text-base font-bold">Send an invite</h2>
          <p className="pt-1 text-xs text-muted-foreground">
            Pick a type, then choose a place from search.
          </p>
          <div className="grid grid-cols-4 gap-2 pt-4">
            {inviteOptions.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onPick(o.id);
                  onOpenChange(false);
                }}
                className="flex flex-col items-center gap-1 rounded-2xl chip py-3 text-muted-foreground transition-transform active:scale-95"
              >
                <o.icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                <span className="text-[10px] font-medium">{o.label}</span>
              </button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
