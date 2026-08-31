import { useEffect, useState } from "react";
import { Lock } from "lucide-react";

/**
 * In-app PIN prompt for Secret Chat Lock.
 * Replaces window.prompt(), which freezes the whole app inside embedded
 * previews/webviews and made the Secret Lock option look broken.
 */
export function PinDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  error,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (pin: string) => void;
}) {
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (open) setPin("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/80 px-6 backdrop-blur-sm">
      <form
        className="w-full max-w-xs space-y-4 rounded-2xl bg-zinc-900 p-6 text-center text-white shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(pin);
        }}
      >
        <Lock size={26} className="mx-auto text-purple-400" />
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          {description && <p className="mt-1 text-xs text-zinc-400">{description}</p>}
        </div>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          inputMode="numeric"
          type="password"
          autoFocus
          aria-label="Chat PIN"
          className="h-12 w-full rounded-xl bg-zinc-800 px-4 text-center text-lg outline-none"
        />
        {error && <p className="text-xs font-medium text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 flex-1 rounded-xl bg-zinc-800 text-sm font-semibold text-zinc-300"
          >
            Cancel
          </button>
          <button type="submit" className="h-11 flex-1 rounded-xl bg-purple-600 text-sm font-bold">
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
