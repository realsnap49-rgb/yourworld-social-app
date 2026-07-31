import { useEffect, useRef } from "react";

/** Freehand drawing surface that exports a transparent PNG on every stroke end. */
export function DrawCanvas({
  color,
  size,
  eraser,
  onCommit,
  initial,
  registerClear,
}: {
  color: string;
  size: number;
  eraser: boolean;
  onCommit: (dataUrl: string | undefined) => void;
  initial?: string;
  registerClear?: (fn: () => void) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const opts = useRef({ color, size, eraser });
  opts.current = { color, size, eraser };

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * 2);
    canvas.height = Math.round(rect.height * 2);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (initial) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = initial;
      dirty.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    registerClear?.(() => {
      const canvas = ref.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dirty.current = false;
      onCommit(undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerClear]);

  const point = (e: React.PointerEvent) => {
    const canvas = ref.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const ctx2d = () => ref.current?.getContext("2d") ?? null;

  const down = (e: React.PointerEvent) => {
    const ctx = ctx2d();
    if (!ctx) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawing.current = true;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = ctx2d();
    if (!ctx) return;
    const { color: c, size: s, eraser: er } = opts.current;
    ctx.globalCompositeOperation = er ? "destination-out" : "source-over";
    ctx.strokeStyle = c;
    ctx.lineWidth = s * 2;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    dirty.current = true;
  };

  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = ref.current;
    if (!canvas) return;
    onCommit(dirty.current ? canvas.toDataURL("image/png") : undefined);
  };

  return (
    <canvas
      ref={ref}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerLeave={up}
      className="absolute inset-0 h-full w-full touch-none"
    />
  );
}