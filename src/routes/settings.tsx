import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  User,
  Mail,
  Phone,
  Lock,
  Link2,
  Trash2,
  LogOut,
  Eye,
  EyeOff,
  Check,
  Smartphone,
  Laptop,
  Monitor,
  MapPin,
  Clock,
  X,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";
import { currentUser } from "@/lib/yw-data";
import { YwAvatar } from "@/components/yw/Avatar";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "Settings — YourWorld" }],
  }),
  component: SettingsPage,
});

/* ══════════════════ SESSION DATA ══════════════════ */

type Session = {
  id: string;
  label: string;
  browser: string;
  os: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
  kind: "phone" | "laptop" | "desktop";
};

const INITIAL_SESSIONS: Session[] = [
  {
    id: "s0",
    label: "iPhone 15 Pro",
    browser: "Safari 17",
    os: "iOS 17.4",
    location: "Tokyo, Japan",
    ip: "203.0.113.42",
    lastActive: "Active now",
    isCurrent: true,
    kind: "phone",
  },
  {
    id: "s1",
    label: "MacBook Pro",
    browser: "Chrome 124",
    os: "macOS 14.4",
    location: "Tokyo, Japan",
    ip: "203.0.113.43",
    lastActive: "2 hours ago",
    isCurrent: false,
    kind: "laptop",
  },
  {
    id: "s2",
    label: "Windows PC",
    browser: "Firefox 125",
    os: "Windows 11",
    location: "Osaka, Japan",
    ip: "198.51.100.7",
    lastActive: "Yesterday, 9:14 PM",
    isCurrent: false,
    kind: "desktop",
  },
  {
    id: "s3",
    label: "Samsung Galaxy S24",
    browser: "Chrome 124",
    os: "Android 14",
    location: "Kyoto, Japan",
    ip: "198.51.100.81",
    lastActive: "3 days ago",
    isCurrent: false,
    kind: "phone",
  },
];

/* ══════════════════ SMALL HELPERS ══════════════════ */

function DeviceIcon({ kind, className }: { kind: Session["kind"]; className?: string }) {
  const props = { className: cn("shrink-0", className), strokeWidth: 1.6 };
  if (kind === "phone") return <Smartphone {...props} />;
  if (kind === "laptop") return <Laptop {...props} />;
  return <Monitor {...props} />;
}

function Toggle({
  checked,
  onChange,
  accent,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  accent?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[28px] w-[48px] shrink-0 rounded-full transition-all duration-300 active:scale-95",
        checked
          ? (accent ?? "bg-primary")
          : "bg-[color-mix(in_oklab,var(--foreground)_15%,transparent)]",
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_4px_oklch(0_0_0/0.35)] transition-all duration-300",
          checked ? "left-[calc(100%-25px)]" : "left-[3px]",
        )}
      />
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block font-ui text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
      {children}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  multiline,
  rows = 3,
  hint,
  inputRef,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  rows?: number;
  hint?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const [showPwd, setShowPwd] = useState(false);
  const resolvedType = type === "password" ? (showPwd ? "text" : "password") : type;
  const inputCls =
    "w-full rounded-[13px] bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)] px-3.5 py-2.5 font-ui text-[14px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-[color-mix(in_oklab,var(--foreground)_22%,transparent)] transition-all duration-200 resize-none";

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className={inputCls}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={resolvedType}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn(inputCls, type === "password" && "pr-10")}
          />
        )}
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
          >
            {showPwd ? (
              <EyeOff className="h-4 w-4" strokeWidth={1.7} />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={1.7} />
            )}
          </button>
        )}
      </div>
      {hint && (
        <p className="mt-1 font-ui text-[11px] text-muted-foreground/50">{hint}</p>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
  danger,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section className="animate-rise">
      <div className="mb-2.5 flex items-center gap-2 px-1">
        <span
          className={cn(
            "grid h-6 w-6 place-items-center rounded-[7px]",
            danger
              ? "bg-destructive/15 text-destructive"
              : "bg-[color-mix(in_oklab,var(--foreground)_9%,transparent)] text-foreground/70",
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
        </span>
        <span
          className={cn(
            "font-ui text-[12px] font-semibold uppercase tracking-[0.07em]",
            danger ? "text-destructive/80" : "text-muted-foreground/60",
          )}
        >
          {title}
        </span>
      </div>
      <div className="surface-card overflow-hidden rounded-[22px] px-4 py-4">
        {children}
      </div>
    </section>
  );
}

function Divider() {
  return <div className="hairline -mx-4 my-3.5 border-t" />;
}

function ActionRow({
  label,
  hint,
  onClick,
  danger,
}: {
  label: string;
  hint?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 text-left transition-colors duration-150 active:opacity-70",
        danger ? "text-destructive" : "text-foreground",
      )}
    >
      <span className="min-w-0">
        <span className="block font-ui text-[14px] font-medium">{label}</span>
        {hint && (
          <span className="block font-ui text-[12px] text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
      <ChevronRight
        className={cn(
          "h-4 w-4 shrink-0",
          danger ? "text-destructive/60" : "text-muted-foreground/40",
        )}
        strokeWidth={1.8}
      />
    </button>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  accent,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="min-w-0">
        <span className="block font-ui text-[14px] font-medium text-foreground">
          {label}
        </span>
        {hint && (
          <span className="block font-ui text-[12px] text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
      <Toggle checked={checked} onChange={onChange} accent={accent} />
    </div>
  );
}

function SocialIcon({ brand }: { brand: "facebook" | "instagram" | "snapchat" }) {
  if (brand === "facebook")
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
        <path d="M24 12.073C24 5.406 18.627 0 12 0S0 5.406 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
      </svg>
    );
  if (brand === "instagram")
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
      <path d="M12.065.001c1.587.01 6.682.464 8.913 5.213.698 1.46.527 3.821.387 5.596-.035.458-.068.891-.085 1.291.264.13.697.27 1.404.27.498 0 1.035-.146 1.594-.439l.031-.016a.746.746 0 01.323-.085c.304 0 .612.206.612.549 0 .655-.991.996-1.272 1.073-.072.019-.162.039-.267.063-.71.162-1.993.462-2.381 1.722-.038.124-.049.24-.03.318.226.935 1.66 2.68 4.026 4.578.176.143.387.388.389.742.003.509-.38.96-.93 1.132-.354.112-.69.126-.909.126-.18 0-.302-.012-.322-.014-.52-.062-1.021-.325-1.612-.627-.824-.419-1.756-.895-3.018-.895-.18 0-.362.01-.543.03-.746.082-1.39.418-2.083.782-.966.507-2.057 1.08-3.784 1.08h-.001c-1.726 0-2.813-.573-3.778-1.08-.694-.363-1.339-.7-2.086-.782a5.647 5.647 0 00-.543-.03c-1.266 0-2.202.477-3.028.896-.588.302-1.089.563-1.613.625-.018.002-.14.015-.32.015-.218 0-.556-.015-.91-.127-.553-.173-.934-.624-.93-1.134.002-.352.213-.598.389-.74 2.37-1.898 3.803-3.643 4.028-4.579.019-.076.009-.192-.03-.316-.389-1.261-1.672-1.56-2.382-1.723-.105-.024-.194-.043-.267-.063-.388-.105-1.272-.473-1.272-1.074 0-.343.308-.549.612-.549.098 0 .201.028.302.083l.052.019c.56.293 1.097.439 1.595.439.747 0 1.195-.26 1.412-.277-.018-.4-.05-.832-.084-1.29-.142-1.775-.312-4.136.385-5.597C5.264.463 10.378.01 11.966 0l.1-.001z" />
    </svg>
  );
}

/* ══════════════════ PASSWORD GATE DIALOG ══════════════════ */

type PendingAction =
  | { kind: "remove-one"; sessionId: string }
  | { kind: "remove-all" };

function PasswordGateDialog({
  open,
  pending,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  pending: PendingAction | null;
  onConfirm: (password: string) => void;
  onCancel: () => void;
}) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isRemoveAll = pending?.kind === "remove-all";

  function handleConfirm() {
    if (pwd.length < 1) {
      setError("Please enter your password.");
      inputRef.current?.focus();
      return;
    }
    // In a real app, verify against API. Here we accept anything non-empty.
    setError("");
    onConfirm(pwd);
    setPwd("");
  }

  function handleCancel() {
    setPwd("");
    setError("");
    onCancel();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent className="mx-auto max-w-sm rounded-[24px] border-0 bg-[color-mix(in_oklab,var(--card)_80%,transparent)] p-0 shadow-2xl backdrop-blur-3xl [&>button]:hidden">
        <DialogTitle className="sr-only">Confirm password</DialogTitle>
        <div className="px-6 pb-6 pt-6">
          {/* icon */}
          <div className="mb-4 flex justify-center">
            <span className="grid h-14 w-14 place-items-center rounded-[18px] bg-amber-500/15">
              <ShieldCheck className="h-7 w-7 text-amber-400" strokeWidth={1.6} />
            </span>
          </div>

          <h2 className="text-center font-ui text-[17px] font-semibold text-foreground">
            {isRemoveAll ? "Log Out All Other Devices" : "Remove Device"}
          </h2>
          <p className="mt-1.5 text-center font-ui text-[13px] leading-relaxed text-muted-foreground">
            {isRemoveAll
              ? "Enter your password to sign out of all other active sessions."
              : "Enter your password to remove this device from your account."}
          </p>

          {/* password field */}
          <div className="mt-5">
            <div className="relative">
              <input
                ref={inputRef}
                type={showPwd ? "text" : "password"}
                value={pwd}
                onChange={(e) => { setPwd(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                placeholder="Enter your password"
                autoFocus
                className={cn(
                  "w-full rounded-[13px] bg-[color-mix(in_oklab,var(--foreground)_7%,transparent)] px-3.5 py-2.5 pr-10 font-ui text-[14px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 transition-all duration-200",
                  error
                    ? "ring-1 ring-destructive/60 focus:ring-destructive/60"
                    : "focus:ring-[color-mix(in_oklab,var(--foreground)_22%,transparent)]",
                )}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"
              >
                {showPwd ? <EyeOff className="h-4 w-4" strokeWidth={1.7} /> : <Eye className="h-4 w-4" strokeWidth={1.7} />}
              </button>
            </div>
            {error && (
              <p className="mt-1.5 flex items-center gap-1.5 font-ui text-[12px] text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
                {error}
              </p>
            )}
          </div>

          {/* actions */}
          <div className="mt-5 flex gap-2.5">
            <button
              onClick={handleCancel}
              className="flex-1 rounded-[13px] bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] py-2.5 font-ui text-[14px] font-medium text-foreground transition-all duration-150 active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className={cn(
                "flex-1 rounded-[13px] py-2.5 font-ui text-[14px] font-semibold transition-all duration-150 active:scale-95",
                isRemoveAll
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-primary text-primary-foreground",
              )}
            >
              {isRemoveAll ? "Log Out All" : "Remove"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════ ACTIVE SESSIONS SHEET ══════════════════ */

function ActiveSessionsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [sessions, setSessions] = useState<Session[]>(INITIAL_SESSIONS);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [removedId, setRemovedId] = useState<string | null>(null);

  const others = sessions.filter((s) => !s.isCurrent);

  function requestRemoveOne(id: string) {
    setPending({ kind: "remove-one", sessionId: id });
    setPwdOpen(true);
  }

  function requestRemoveAll() {
    setPending({ kind: "remove-all" });
    setPwdOpen(true);
  }

  function handleConfirm(_pwd: string) {
    setPwdOpen(false);
    if (!pending) return;

    if (pending.kind === "remove-one") {
      setRemovedId(pending.sessionId);
      setTimeout(() => {
        setSessions((prev) => prev.filter((s) => s.id !== pending.sessionId));
        setRemovedId(null);
      }, 350);
    } else {
      // remove all non-current
      const ids = others.map((s) => s.id);
      ids.forEach((id) => {
        setTimeout(() => {
          setSessions((prev) => prev.filter((s) => s.id !== id));
        }, 350);
      });
    }
    setPending(null);
  }

  function handlePwdCancel() {
    setPwdOpen(false);
    setPending(null);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-[28px] border-0 bg-[color-mix(in_oklab,var(--card)_75%,transparent)] p-0 backdrop-blur-3xl [&>button]:hidden"
        >
          <SheetTitle className="sr-only">Active Sessions</SheetTitle>

          {/* drag handle */}
          <div className="flex justify-center pt-3">
            <div className="h-1 w-10 rounded-full bg-[color-mix(in_oklab,var(--foreground)_18%,transparent)]" />
          </div>

          {/* header */}
          <div className="flex items-center justify-between px-5 pb-2 pt-3">
            <div>
              <h2 className="font-ui text-[17px] font-semibold text-foreground">
                Active Sessions
              </h2>
              <p className="font-ui text-[12px] text-muted-foreground">
                {sessions.length} device{sessions.length !== 1 ? "s" : ""} signed in
              </p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="grid h-8 w-8 place-items-center rounded-full bg-[color-mix(in_oklab,var(--foreground)_9%,transparent)] transition-all active:scale-90"
            >
              <X className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
            </button>
          </div>

          {/* session list */}
          <div className="max-h-[60vh] overflow-y-auto pb-8">
            {/* current device */}
            {sessions.filter((s) => s.isCurrent).map((s) => (
              <div key={s.id} className="px-5 py-1">
                <p className="mb-2 font-ui text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50">
                  This device
                </p>
                <SessionCard session={s} onRemove={null} isRemoving={false} />
              </div>
            ))}

            {/* other devices */}
            {others.length > 0 && (
              <div className="px-5 pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-ui text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50">
                    Other devices ({others.length})
                  </p>
                  <button
                    onClick={requestRemoveAll}
                    className="font-ui text-[12px] font-semibold text-destructive/80 transition-opacity active:opacity-60"
                  >
                    Log out all
                  </button>
                </div>
                <div className="space-y-2.5">
                  {others.map((s) => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      onRemove={() => requestRemoveOne(s.id)}
                      isRemoving={removedId === s.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {others.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <ShieldCheck className="h-8 w-8 text-green-400/60" strokeWidth={1.4} />
                <p className="font-ui text-[13px] text-muted-foreground">
                  No other active sessions
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <PasswordGateDialog
        open={pwdOpen}
        pending={pending}
        onConfirm={handleConfirm}
        onCancel={handlePwdCancel}
      />
    </>
  );
}

function SessionCard({
  session,
  onRemove,
  isRemoving,
}: {
  session: Session;
  onRemove: (() => void) | null;
  isRemoving: boolean;
}) {
  return (
    <div
      className={cn(
        "surface-card flex items-start gap-3.5 rounded-[18px] px-4 py-3.5 transition-all duration-300",
        isRemoving && "scale-95 opacity-0",
      )}
    >
      {/* device icon */}
      <span
        className={cn(
          "mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-[13px]",
          session.isCurrent
            ? "bg-primary/15 text-primary"
            : "bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] text-foreground/60",
        )}
      >
        <DeviceIcon kind={session.kind} className="h-5 w-5" />
      </span>

      {/* info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-ui text-[14px] font-semibold text-foreground truncate">
            {session.label}
          </p>
          {session.isCurrent && (
            <span className="shrink-0 rounded-full bg-green-500/20 px-2 py-0.5 font-ui text-[10px] font-semibold text-green-400">
              Current
            </span>
          )}
        </div>
        <p className="font-ui text-[12px] text-muted-foreground">
          {session.browser} · {session.os}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="flex items-center gap-1 font-ui text-[11px] text-muted-foreground/70">
            <MapPin className="h-3 w-3" strokeWidth={1.8} />
            {session.location} · {session.ip}
          </span>
          <span className="flex items-center gap-1 font-ui text-[11px] text-muted-foreground/70">
            <Clock className="h-3 w-3" strokeWidth={1.8} />
            {session.lastActive}
          </span>
        </div>
      </div>

      {/* remove button */}
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label="Remove device"
          className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] text-muted-foreground/60 transition-all duration-150 hover:bg-destructive/15 hover:text-destructive active:scale-90"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}

/* ══════════════════ MAIN PAGE ══════════════════ */

function SettingsPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username);
  const [bio, setBio] = useState(currentUser.bio ?? "");
  const [email, setEmail] = useState("you@yourworld.app");
  const [phone, setPhone] = useState("+1 (555) 000-0000");
  const [twoFa, setTwoFa] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fbOn, setFbOn] = useState(false);
  const [igOn, setIgOn] = useState(true);
  const [scOn, setScOn] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <main className="grain relative min-h-screen pb-28">
      <div aria-hidden className="ambient-canvas" />

      {/* ── header ── */}
      <header className="header-lux sticky top-0 z-40 flex h-14 items-center gap-3 px-4">
        <Link
          to="/profile"
          aria-label="Back"
          className="icon-pill -ml-1 grid h-9 w-9 place-items-center rounded-full transition-all duration-200 active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
        </Link>
        <h1 className="flex-1 font-ui text-[17px] font-semibold leading-none tracking-[-0.02em] text-foreground">
          Account Settings
        </h1>
        <button
          onClick={handleSave}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-[10px] px-3.5 font-ui text-[13px] font-semibold transition-all duration-300 active:scale-95",
            saved
              ? "bg-green-500/20 text-green-400"
              : "bg-primary text-primary-foreground",
          )}
        >
          {saved ? (
            <><Check className="h-3.5 w-3.5" strokeWidth={2.5} />Saved</>
          ) : (
            "Save"
          )}
        </button>
      </header>

      <div className="space-y-5 px-4 pt-5">

        {/* ── avatar hero ── */}
        <div className="flex flex-col items-center pb-1 pt-2">
          <div className="relative">
            <YwAvatar user={currentUser} size={80} />
            <button
              aria-label="Change photo"
              className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-primary shadow-[0_2px_8px_oklch(0_0_0/0.5)] ring-2 ring-background transition-transform duration-200 active:scale-90"
            >
              <Camera className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={2} />
            </button>
          </div>
          <p className="mt-3 font-ui text-[15px] font-semibold text-foreground">{name}</p>
          <p className="font-ui text-[13px] text-muted-foreground">@{username}</p>
        </div>

        {/* ── edit profile ── */}
        <Section icon={User} title="Edit Profile">
          <div className="space-y-3.5">
            <Field label="Full name" value={name} onChange={setName} placeholder="Your name" />
            <Field label="Username" value={username} onChange={setUsername} placeholder="username" hint="yourworld.app/@username" />
            <Field label="Bio" value={bio} onChange={setBio} placeholder="Write something about yourself…" multiline rows={4} />
          </div>
        </Section>

        {/* ── contact details ── */}
        <Section icon={Mail} title="Contact Details">
          <div className="space-y-3.5">
            <Field label="Email address" value={email} onChange={setEmail} type="email" placeholder="you@example.com" />
            <Field label="Phone number" value={phone} onChange={setPhone} type="tel" placeholder="+1 (000) 000-0000" />
          </div>
        </Section>

        {/* ── security ── */}
        <Section icon={Lock} title="Security">
          <ActionRow label="Change Password" hint="Last changed 3 months ago" />
          <Divider />
          <ToggleRow
            label="Two-Factor Authentication"
            hint={twoFa ? "Enabled via authenticator app" : "Add an extra layer of security"}
            checked={twoFa}
            onChange={setTwoFa}
          />
          {twoFa && (
            <>
              <Divider />
              <ActionRow label="Manage 2FA Devices" hint="View paired authenticators" />
            </>
          )}
          <Divider />
          <ActionRow
            label="Active Sessions"
            hint="Review where you're signed in"
            onClick={() => setSessionsOpen(true)}
          />
        </Section>

        {/* ── linked accounts ── */}
        <Section icon={Link2} title="Linked Accounts">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] text-white" style={{ background: "#1877F2" }}>
              <SocialIcon brand="facebook" />
            </span>
            <div className="flex flex-1 items-center justify-between gap-4">
              <div>
                <p className="font-ui text-[14px] font-medium text-foreground">Facebook</p>
                <p className="font-ui text-[12px] text-muted-foreground">{fbOn ? "Connected" : "Not connected"}</p>
              </div>
              <Toggle checked={fbOn} onChange={setFbOn} accent="bg-[#1877F2]" />
            </div>
          </div>
          <Divider />
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] text-white" style={{ background: "linear-gradient(135deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)" }}>
              <SocialIcon brand="instagram" />
            </span>
            <div className="flex flex-1 items-center justify-between gap-4">
              <div>
                <p className="font-ui text-[14px] font-medium text-foreground">Instagram</p>
                <p className="font-ui text-[12px] text-muted-foreground">{igOn ? "Connected as @you" : "Not connected"}</p>
              </div>
              <Toggle checked={igOn} onChange={setIgOn} accent="bg-[#dc2743]" />
            </div>
          </div>
          <Divider />
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] text-black" style={{ background: "#FFFC00" }}>
              <SocialIcon brand="snapchat" />
            </span>
            <div className="flex flex-1 items-center justify-between gap-4">
              <div>
                <p className="font-ui text-[14px] font-medium text-foreground">Snapchat</p>
                <p className="font-ui text-[12px] text-muted-foreground">{scOn ? "Connected" : "Not connected"}</p>
              </div>
              <Toggle checked={scOn} onChange={setScOn} accent="bg-[#FFFC00]" />
            </div>
          </div>
        </Section>

        {/* ── log out ── */}
        <div className="surface-card overflow-hidden rounded-[22px]">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)] active:opacity-70"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] text-muted-foreground">
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.7} />
            </span>
            <span className="font-ui text-[14px] font-medium text-foreground">Log Out</span>
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/40" strokeWidth={1.8} />
          </button>
        </div>

        {/* ── danger zone ── */}
        <Section icon={Trash2} title="Danger Zone" danger>
          <div className="space-y-3">
            <p className="font-ui text-[13px] leading-relaxed text-muted-foreground">
              Once you delete your account, all your moments, posts, and data will be permanently removed. This action cannot be undone.
            </p>
            <button className="flex w-full items-center justify-center gap-2 rounded-[13px] border border-destructive/30 bg-destructive/10 py-2.5 font-ui text-[14px] font-semibold text-destructive transition-all duration-200 hover:bg-destructive/15 active:scale-[0.98]">
              <Trash2 className="h-4 w-4" strokeWidth={1.8} />
              Delete My Account
            </button>
          </div>
        </Section>

      </div>

      {/* ── active sessions sheet ── */}
      <ActiveSessionsSheet open={sessionsOpen} onOpenChange={setSessionsOpen} />
    </main>
  );
}
