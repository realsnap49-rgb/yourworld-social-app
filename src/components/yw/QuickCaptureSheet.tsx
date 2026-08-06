import { useCallback, useEffect, useRef, useState } from "react";
import { X, Circle, SwitchCamera } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export type CaptureResult = { url: string; viewOnce: number };

interface QuickCaptureSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture?: (result: CaptureResult) => void;
}

export function QuickCaptureSheet({
  open,
  onOpenChange,
  onCapture,
}: QuickCaptureSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl bg-black text-white p-6">
        <div className="flex h-full flex-col justify-between items-center">
          <div className="flex w-full justify-between items-center">
            <button onClick={() => onOpenChange(false)} className="p-2">
              <X className="h-6 w-6" />
            </button>
            <span className="font-semibold">Quick Capture</span>
            <div className="w-6" />
          </div>
          <div className="my-auto text-center text-muted-foreground">
            Camera view placeholder
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
