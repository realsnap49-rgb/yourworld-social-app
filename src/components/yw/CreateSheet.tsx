import { useNavigate } from "@tanstack/react-router";
import { ImageIcon, Clapperboard, Radio } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface CreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MODES = [
  {
    mode: "POST" as const,
    label: "Post",
    hint: "Photo or video for your feed",
    icon: ImageIcon,
  },
  {
    mode: "REEL" as const,
    label: "Reel",
    hint: "Short vertical video",
    icon: Clapperboard,
  },
  {
    mode: "LIVE" as const,
    label: "Live",
    hint: "Stream to your world right now",
    icon: Radio,
  },
];

export function CreateSheet({ open, onOpenChange }: CreateSheetProps) {
  const navigate = useNavigate();

  const go = (mode: "POST" | "REEL" | "LIVE") => {
    onOpenChange(false);
    navigate({ to: "/create", search: { mode } });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-border/60 pb-8">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-xl">Create</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {MODES.map(({ mode, label, hint, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => go(mode)}
              className="flex w-full items-center gap-4 rounded-2xl bg-secondary px-4 py-3.5 text-left transition-transform active:scale-[0.98]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-background/60">
                <Icon className="h-5 w-5 text-foreground" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block truncate text-xs text-muted-foreground">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
