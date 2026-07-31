import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { isUnlockedForSession, useOrbit } from "@/lib/orbit-store";

/** Blocks the whole Orbit tree behind the device PIN/password when the lock is on. */
export function OrbitLockGate({ children }: { children: ReactNode }) {
  const orbit = useOrbit();
  const [unlocked, setUnlocked] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setUnlocked(isUnlockedForSession());
  }, []);

  if (!orbit.hydrated) return null;
  if (!orbit.privacy.lockEnabled || unlocked) return <>{children}</>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await orbit.verifyOrbitPin(value);
    setBusy(false);
    if (ok) setUnlocked(true);
    else {
      setError(true);
      setValue("");
    }
  };

  return (
    <main className="min-h-screen">
      <header className="flex items-center gap-2 px-3 py-3">
        <Link
          to="/settings"
          aria-label="Back to settings"
          className="grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
        </Link>
      </header>

      <div className="mx-auto flex max-w-sm flex-col items-center px-6 pt-16 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-3xl bg-secondary">
          <Lock className="h-6 w-6" strokeWidth={1.7} />
        </span>
        <h1 className="pt-5 font-display text-xl font-bold">Orbit is locked</h1>
        <p className="pt-1.5 text-sm leading-relaxed text-muted-foreground">
          Enter your Orbit PIN or password to continue. It never leaves this device.
        </p>

        <form onSubmit={submit} className="w-full pt-6">
          <Input
            type="password"
            inputMode="numeric"
            autoFocus
            autoComplete="current-password"
            value={value}
            maxLength={64}
            onChange={(e) => {
              setValue(e.target.value);
              setError(false);
            }}
            placeholder="Orbit PIN"
            aria-label="Orbit PIN or password"
            aria-invalid={error}
            className="h-12 rounded-xl text-center tracking-[0.4em]"
          />
          {error && <p className="pt-2 text-xs text-destructive">Incorrect PIN. Try again.</p>}
          <Button
            type="submit"
            disabled={!value.trim() || busy}
            className="mt-4 h-12 w-full rounded-full"
          >
            Unlock Orbit
          </Button>
        </form>
      </div>
    </main>
  );
}
