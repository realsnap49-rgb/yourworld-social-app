import { useNavigate } from "@tanstack/react-router";
import { Clapperboard, Image as ImageIcon, Radio } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const OPTIONS = [
  { mode: "POST" as const, label: "Post", desc: "Photo or video for your feed", icon: ImageIcon },
  { mode: "REEL" as const, label: "Reel", desc: "Short vertical video", icon: Clapperboard },
  { mode: "LIVE" as const, label: "Live", desc: "Go live with your followers", icon: Radio },
];

export function CreateSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-border/60">
        <SheetHeader className="text-left">
          <SheetTitle>Create</SheetTitle>
        </SheetHeader>
        <div className="grid gap-2 pb-6">
          {OPTIONS.map((o) => (
            <button
              key={o.mode}
              type="button"
              onClick={() => {
                onOpenChange(false);
                navigate({ to: "/create", search: { mode: o.mode } });
              }}
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
  );
}