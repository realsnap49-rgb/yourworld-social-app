import { memo } from "react";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/yw-data";

function YwAvatarBase({
  user,
  size = 40,
  className,
}: {
  user: User;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-display font-bold text-foreground",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        backgroundImage: `linear-gradient(140deg, oklch(0.55 0.2 ${user.hue}), oklch(0.32 0.12 ${user.hue + 40}))`,
      }}
      aria-hidden
    >
      {user.name.charAt(0)}
    </span>
  );
}

export const YwAvatar = memo(YwAvatarBase);