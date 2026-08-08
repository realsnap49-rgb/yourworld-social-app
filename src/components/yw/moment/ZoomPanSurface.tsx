import { useCallback, useEffect, useRef } from "react";

export type CropTransform = { zoom: number; x: number; y: number };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Pinch / wheel / drag zoom-pan surface used by the moment editor preview.
 * Children are rendered inside a transformed layer with `transform-origin: 0 0`.
 */
export function ZoomPanSurface({
  value,
  onChange,
  disabled,
  className,
  style,
  children,
}: {
  value: CropTransform;
  onChange: (t: CropTransform) => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const stateRef = useRef(value);
  stateRef.current = value;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const apply = useCallback(
    (nextZoom: number, px: number, py: number) => {
      const cur = stateRef.current;
      const z = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      const k = z / cur.zoom;
      onChange(clampPan({ zoom: z, x: px - (px - cur.x) * k, y: py - (py - cur.y) * k }, ref.current));
    },
    [onChange],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (disabledRef.current) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      apply(stateRef.current.zoom * Math.exp(-dy * 0.0018), e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [apply]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) pinch.current = measure();
  };

  const measure = () => {
    const [a, b] = [...pointers.current.values()];
    if (!a || !b) return null;
    return {
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      cx: (a.x + b.x) / 2,
      cy: (a.y + b.y) / 2,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (disabled || !pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2) {
      const next = measure();
      const start = pinch.current;
      if (!next || !start) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      apply(
        stateRef.current.zoom * (next.dist / start.dist),
        next.cx - rect.left,
        next.cy - rect.top,
      );
      pinch.current = next;
      return;
    }

    const cur = stateRef.current;
    if (cur.zoom <= 1.001) return;
    onChange(clampPan({ ...cur, x: cur.x + (e.clientX - prev.x), y: cur.y + (e.clientY - prev.y) }, ref.current));
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    pinch.current = pointers.current.size === 2 ? measure() : null;
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{ touchAction: "none", overflow: "hidden", ...style }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onPointerLeave={endPointer}
    >
      <div
        className="h-full w-full"
        style={{
          transformOrigin: "0 0",
          transform: `translate(${value.x}px, ${value.y}px) scale(${value.zoom})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** keeps the scaled content covering the frame */
export function clampPan(t: CropTransform, el: HTMLElement | null): CropTransform {
  if (!el) return t;
  const w = el.clientWidth;
  const h = el.clientHeight;
  const maxX = 0;
  const minX = w - w * t.zoom;
  const maxY = 0;
  const minY = h - h * t.zoom;
  return { zoom: t.zoom, x: clamp(t.x, minX, maxX), y: clamp(t.y, minY, maxY) };
}
