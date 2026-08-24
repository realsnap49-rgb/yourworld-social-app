import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react";
import type { ProgressFn } from "@/lib/storage-upload";

export type UploadKind = "reel" | "video" | "post";

export type UploadTask = {
  id: string;
  kind: UploadKind;
  label: string;
  thumbnail?: string | null;
  /** Destination to open once the upload finishes. */
  viewTo: string;
  progress: number;
  status: "uploading" | "processing" | "done" | "error";
  error?: string | null;
};

type Ctx = {
  tasks: UploadTask[];
  /** Runs an upload in the background while the user keeps browsing. */
  startUpload: (
    meta: { kind: UploadKind; label: string; thumbnail?: string | null; viewTo: string },
    runner: (onProgress: ProgressFn) => Promise<{ error: string | null }>,
  ) => Promise<{ error: string | null }>;
  dismiss: (id: string) => void;
};

const UploadCtx = createContext<Ctx | null>(null);

export function useUploads() {
  const ctx = useContext(UploadCtx);
  if (!ctx) throw new Error("useUploads must be used inside <UploadProvider>");
  return ctx;
}

export function UploadProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const patch = useCallback((id: string, next: Partial<UploadTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...next } : t)));
  }, []);

  const dismiss = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const startUpload = useCallback<Ctx["startUpload"]>(
    async (meta, runner) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setTasks((prev) => [
        ...prev,
        { id, progress: 0, status: "uploading", ...meta },
      ]);

      let result: { error: string | null };
      try {
        result = await runner((p) =>
          patch(id, {
            progress: p,
            status: p >= 100 ? "processing" : "uploading",
          }),
        );
      } catch (e) {
        result = { error: e instanceof Error ? e.message : "Upload failed" };
      }

      if (result.error) {
        patch(id, { status: "error", error: result.error });
        timers.current.push(setTimeout(() => dismiss(id), 8000));
      } else {
        patch(id, { status: "done", progress: 100 });
        timers.current.push(setTimeout(() => dismiss(id), 6000));
      }
      return result;
    },
    [patch, dismiss],
  );

  // Warn before leaving while media is still uploading.
  const active = tasks.some((t) => t.status === "uploading" || t.status === "processing");
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);

  const value = useMemo(() => ({ tasks, startUpload, dismiss }), [tasks, startUpload, dismiss]);

  return (
    <UploadCtx.Provider value={value}>
      {children}
      <UploadProgressStack />
    </UploadCtx.Provider>
  );
}

const TITLE: Record<UploadKind, string> = {
  reel: "Uploading reel",
  video: "Uploading video",
  post: "Uploading post",
};

function UploadProgressStack() {
  const { tasks, dismiss } = useUploads();
  if (!tasks.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 px-3 pt-3">
      {tasks.map((t) => (
        <div
          key={t.id}
          role="status"
          aria-live="polite"
          className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-[#141418]/95 shadow-xl backdrop-blur-md"
        >
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
              {t.thumbnail ? (
                <img src={t.thumbnail} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-zinc-500">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">
                {t.status === "done"
                  ? "Upload complete"
                  : t.status === "error"
                    ? "Upload failed"
                    : TITLE[t.kind]}
              </p>
              <p className="truncate text-[11px] text-zinc-400">
                {t.status === "error"
                  ? t.error
                  : t.status === "done"
                    ? t.label
                    : t.status === "processing"
                      ? "Finishing up…"
                      : `${t.progress}% · ${t.label}`}
              </p>
            </div>

            {t.status === "done" ? (
              <Link
                to={t.viewTo}
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-3 py-1.5 text-[11px] font-bold text-white"
              >
                View
              </Link>
            ) : t.status === "error" ? (
              <AlertCircle size={18} className="shrink-0 text-red-400" />
            ) : (
              <span className="shrink-0 text-[11px] font-bold tabular-nums text-pink-400">
                {t.progress}%
              </span>
            )}

            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss upload notification"
              className="shrink-0 text-zinc-500 hover:text-white"
            >
              <X size={15} />
            </button>
          </div>

          <div className="h-1 w-full bg-zinc-800">
            <div
              className={`h-full transition-[width] duration-300 ${
                t.status === "error"
                  ? "bg-red-500"
                  : t.status === "done"
                    ? "bg-emerald-500"
                    : "bg-gradient-to-r from-pink-500 to-purple-500"
              }`}
              style={{ width: `${t.status === "done" ? 100 : t.progress}%` }}
            />
          </div>

          {t.status === "done" && (
            <span className="sr-only">
              <CheckCircle2 size={12} /> done
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
