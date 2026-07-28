import { useEffect, useRef, useState } from "react";

const TOKEN = /(https?:\/\/[^\s]+|www\.[^\s]+|#[\p{L}\p{N}_]+|@[\w.]+)/gu;

function renderLine(line: string, key: string) {
  const parts = line.split(TOKEN);
  return (
    <span key={key}>
      {parts.map((part, i) => {
        if (!part) return null;
        if (/^(https?:\/\/|www\.)/i.test(part)) {
          const href = part.startsWith("http") ? part : `https://${part}`;
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              {part.replace(/^https?:\/\//, "")}
            </a>
          );
        }
        if (part.startsWith("#") || part.startsWith("@")) {
          return (
            <span key={i} className="text-primary">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export function Bio({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const prev = el.style.webkitLineClamp;
      el.style.webkitLineClamp = "5";
      setOverflows(el.scrollHeight - el.clientHeight > 1);
      el.style.webkitLineClamp = prev;
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  const lines = text.split("\n");

  return (
    <div className="pt-1">
      <p
        ref={ref}
        className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground"
        style={
          expanded
            ? undefined
            : {
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 5,
                overflow: "hidden",
              }
        }
      >
        {lines.map((l, i) => (
          <span key={i}>
            {renderLine(l, `l${i}`)}
            {i < lines.length - 1 ? "\n" : null}
          </span>
        ))}
      </p>
      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-semibold text-foreground/80 transition-opacity active:opacity-60"
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
