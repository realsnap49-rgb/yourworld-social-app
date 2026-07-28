import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export function ChannelHeader({
  title,
  backTo = "/channel",
  action,
}: {
  title: string;
  backTo?: string;
  action?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-border glass px-3 py-3">
      <Link
        to={backTo}
        aria-label="Go back"
        className="grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-90"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
      </Link>
      <h1 className="min-w-0 flex-1 truncate font-display text-lg font-bold">{title}</h1>
      {action}
    </header>
  );
}

export function ChannelCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="surface-card overflow-hidden rounded-3xl">
      {title && (
        <p className="px-4 pt-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
      )}
      {children}
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="surface-card rounded-3xl p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="pt-1 font-display text-xl font-bold">{value}</p>
      {hint && <p className="pt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
