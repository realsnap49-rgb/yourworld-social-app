import React from "react";

/**
 * Subtle repeating diagonal username watermark.
 * Purely decorative + deterrent: never intercepts pointer events.
 */
export const UserWatermark = React.memo(function UserWatermark({
  username,
  className = "",
}: {
  username: string;
  className?: string;
}) {
  const label = username.startsWith("@") ? username : `@${username}`;
  const rows = Array.from({ length: 10 });
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-20 overflow-hidden select-none ${className}`}
    >
      <div className="absolute inset-[-30%] flex -rotate-[24deg] flex-col justify-around">
        {rows.map((_, r) => (
          <div
            key={r}
            className="flex justify-around whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.3em] text-foreground/[0.045]"
          >
            {Array.from({ length: 6 }).map((__, c) => (
              <span key={c}>{label}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});
