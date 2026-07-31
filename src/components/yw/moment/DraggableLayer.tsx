import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type LayerTransform = { x: number; y: number; scale: number; rotation: number };

/**
 * Pointer-driven layer: one finger drags, two fingers pinch-scale and rotate.
 * All maths run against the parent stage rect so values stay normalised 0..1.
 */
export function DraggableLayer({
  transform,
  onChange,
  onSelect,
  selected,
  children,
  className,
}: {
  transform: LayerTransform;
  onChange: (t: LayerTransform) => void;
  onSelect?: () => void;
  selected?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{
    dist: number;
    angle: number;
    scale: number;
    rotation: number;
    cx: number;
    cy: number;
    x: number;
    y: number;
  } | null>(null);

  const stage = () => ref.current?.parentElement?.getBoundingClientRect();

  const snapshot = () => {
    const pts = [...pointers.current.values()];
    if (pts.length < 2) return null;
    const [a, b] = pts as [{ x: number; y: number }, { x: number; y: number }];
    return {
      dist: Math.hypot(b.x - a.x, b.y - a.y),
      angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
      cx: (a.x + b.x) / 2,
      cy: (a.y + b.y) / 2,
    };
  };

  const down = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect?.();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = snapshot();
    start.current = s
      ? { ...s, scale: transform.scale, rotation: transform.rotation, x: transform.x, y: transform.y }
      : {
          dist: 0,
          angle: 0,
          cx: e.clientX,
          cy: e.clientY,
          scale: transform.scale,
          rotation: transform.rotation,
          x: transform.x,
          y: transform.y,
        };
  };

  const move = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !start.current) return;
    e.stopPropagation();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const rect = stage();
    if (!rect) return;
    const s0 = start.current;
    const now = snapshot();

    if (now && s0.dist > 0) {
      onChange({
        x: clamp01(s0.x + (now.cx - s0.cx) / rect.width),
        y: clamp01(s0.y + (now.cy - s0.cy) / rect.height),
        scale: Math.min(6, Math.max(0.35, (s0.scale * now.dist) / s0.dist)),
        rotation: s0.rotation + (now.angle - s0.angle),
      });
      return;
    }

    onChange({
      ...transform,
      x: clamp01(s0.x + (e.clientX - s0.cx) / rect.width),
      y: clamp01(s0.y + (e.clientY - s0.cy) / rect.height),
    });
  };

  const up = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) start.current = null;
    else {
      const s = snapshot();
      if (s)
        start.current = {
          ...s,
          scale: transform.scale,
          rotation: transform.rotation,
          x: transform.x,
          y: transform.y,
        };
    }
  };

  return (
    <div
      ref={ref}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      style={{
        left: `${transform.x * 100}%`,
        top: `${transform.y * 100}%`,
        transform: `translate3d(-50%, -50%, 0) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
        willChange: "transform",
      }}
      className={cn(
        "absolute touch-none select-none",
        selected && "rounded-xl outline outline-1 outline-dashed outline-white/60",
        className,
      )}
    >
      {children}
    </div>
  );
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));