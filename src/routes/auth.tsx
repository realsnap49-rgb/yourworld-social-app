import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { toast } from "sonner";
import { ArrowLeft, Camera, Check, Loader2, Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type Flow = "login" | "signup" | "forgot";
type Step =
  | "identifier"
  | "otp"
  | "username"
  | "password"
  | "gender"
  | "photo"
  | "newPassword"
  | "done";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — YourWorld" },
      {
        name: "description",
        content:
          "Sign in or create your YourWorld account to see moments, reels, chats and your Orbit.",
      },
      { property: "og:title", content: "Sign in — YourWorld" },
      { property: "og:description", content: "Log in or sign up to your YourWorld account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const GENDERS = ["Woman", "Man", "Non-binary", "Prefer not to say"];

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
function isPhone(value: string) {
  return /^\+?[0-9][0-9\s-]{6,17}$/.test(value.trim());
}
function normalizePhone(value: string) {
  const digits = value.replace(/[^0-9+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits}`;
}

type Channel = "email" | "phone" | null;

/** Auto-detect what the user is typing. */
function detectChannel(value: string): Channel {
  const v = value.trim();
  if (!v) return null;
  if (isEmail(v)) return "email";
  if (isPhone(v)) return "phone";
  if (v.includes("@")) return "email";
  if (/^[+0-9][0-9\s-]*$/.test(v)) return "phone";
  return null;
}

/** Turn raw auth errors into calm, human messages. */
function friendlyError(err: unknown, channel: Channel): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const m = raw.toLowerCase();
  if (
    channel === "phone" &&
    (m.includes("sms") ||
      m.includes("phone provider") ||
      m.includes("unsupported phone provider") ||
      m.includes("provider is not enabled") ||
      m.includes("signups not allowed for otp"))
  ) {
    return "SMS codes aren't available yet — no SMS provider is configured. Please use your email address instead.";
  }
  if (m.includes("signups not allowed") || m.includes("user not found"))
    return "No account found with that email. Tap “Sign up” to create one.";
  if (m.includes("token has expired") || m.includes("invalid token") || m.includes("otp expired"))
    return "That code is invalid or expired. Request a new one.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("user already registered")) return "An account already exists — try signing in.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Network issue. Check your connection and try again.";
  return raw || "Something went wrong. Please try again.";
}

async function shrinkImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL("image/jpeg", 0.8);
}

function AuthPage() {
  // Development shortcut: any account can be entered with this code.
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  const [flow, setFlow] = useState<Flow>("login");
  const [step, setStep] = useState<Step>("identifier");
  const [busy, setBusy] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const verifyingRef = useRef(false);

  const channel = detectChannel(identifier);
  const usingPhone = channel === "phone";
  const identifierValid = isEmail(identifier) || isPhone(identifier);

  const go = (f: Flow) => {
    setFlow(f);
    setStep("identifier");
    setCode("");
    setPassword("");
    setConfirm("");
    setFieldError(null);
  };

  const finish = () => {
    navigate({ to: redirect && redirect.startsWith("/") ? redirect : "/", replace: true });
  };

  const fail = (err: unknown) => {
    const message = friendlyError(err, channel);
    setFieldError(message);
    toast.error(message);
  };

  /* ---------- actions ---------- */

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    if (!identifierValid) {
      const message = "Enter a valid phone number or email address.";
      setFieldError(message);
      toast.error(message);
      return;
    }
    setBusy(true);
    try {
      const shouldCreateUser = flow === "signup";
      const { error } = usingPhone
        ? await supabase.auth.signInWithOtp({
            phone: normalizePhone(identifier),
            options: { shouldCreateUser },
          })
        : await supabase.auth.signInWithOtp({
            email: identifier.trim(),
            // No emailRedirectTo: this makes Supabase send a 6-digit OTP code
            // instead of a magic link. (Requires the email template to include
            // the {{ .Token }} variable.)
            options: { shouldCreateUser },
          });
      if (error) throw error;
      toast.success(
        `${usingPhone ? "SMS" : "Email"} code sent to ${usingPhone ? normalizePhone(identifier) : identifier.trim()}`,
      );
      setCode("");
      setStep("otp");
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (value: string) => {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setFieldError(null);
    setBusy(true);
    try {
      // ---- Universal test code (development shortcut) ----
      if (value === TEST_OTP) {
        const creds = usingPhone
          ? { phone: normalizePhone(identifier), password: TEST_PASSWORD }
          : { email: identifier.trim(), password: TEST_PASSWORD };
        let { error: signInError } = await supabase.auth.signInWithPassword(creds);
        if (signInError) {
          const { error: signUpError } = await supabase.auth.signUp(creds);
          if (signUpError) throw signUpError;
          const retry = await supabase.auth.signInWithPassword(creds);
          signInError = retry.error;
        }
        if (signInError) throw signInError;
        toast.success("Test code accepted");
        if (flow === "signup") setStep("username");
        else if (flow === "forgot") setStep("newPassword");
        else finish();
        return;
      }
      const { error } = usingPhone
        ? await supabase.auth.verifyOtp({
            phone: normalizePhone(identifier),
            token: value,
            type: "sms",
          })
        : await supabase.auth.verifyOtp({
            email: identifier.trim(),
            token: value,
            type: "email",
          });
      if (error) throw error;
      if (flow === "signup") {
        setStep("username");
      } else if (flow === "forgot") {
        setStep("newPassword");
      } else {
        // login: OTP verified means we now have a session — go straight in.
        toast.success("Welcome back");
        finish();
      }
    } catch (err) {
      fail(err);
    } finally {
      verifyingRef.current = false;
      setBusy(false);
    }
  };

  /* ---------- WebOTP: auto-fill the SMS code on the same device ---------- */
  useEffect(() => {
    if (step !== "otp") return;
    if (typeof window === "undefined") return;
    if (!("OTPCredential" in window)) return;
    const ac = new AbortController();
    (async () => {
      try {
        const cred = (await navigator.credentials.get({
          // @ts-expect-error - WebOTP API is not in the TS DOM lib yet
          otp: { transport: ["sms"] },
          signal: ac.signal,
        })) as (Credential & { code?: string }) | null;
        const otp = cred?.code?.replace(/\D/g, "").slice(0, 6);
        if (otp && otp.length === 6) {
          setCode(otp);
          void verifyOtp(otp);
        }
      } catch {
        /* user dismissed, aborted, or unsupported — manual entry still works */
      }
    })();
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---------- Auto-redirect into the app once onboarding completes ---------- */
  useEffect(() => {
    if (step !== "done" || flow === "forgot") return;
    const t = setTimeout(finish, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, flow]);

  const saveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    const handle = username.trim().toLowerCase();
    if (!/^[a-z0-9._]{3,20}$/.test(handle)) {
      const message = "3–20 characters: letters, numbers, dot or underscore.";
      setFieldError(message);
      toast.error(message);
      return;
    }
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Session expired, start again");
      const { error } = await supabase.from("profiles").update({ username: handle }).eq("id", uid);
      if (error) {
        throw new Error(
          error.code === "23505" ? "That username is already taken" : error.message,
        );
      }
      setStep("password");
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    if (password.length < 6) {
      const message = "Password must be at least 6 characters.";
      setFieldError(message);
      toast.error(message);
      return;
    }
    if (password !== confirm) {
      const message = "Passwords do not match.";
      setFieldError(message);
      toast.error(message);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      if (flow === "forgot") {
        setStep("done");
      } else {
        setStep("gender");
      }
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const saveProfileBits = async (patch: { gender?: string | null; avatar_url?: string | null }, next: Step) => {
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (uid) await supabase.from("profiles").update(patch).eq("id", uid);
      setStep(next);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      setAvatar(await shrinkImage(file));
    } catch {
      toast.error("Could not read that image");
    }
  };

  /* ---------- shell ---------- */

  const titles: Record<string, { title: string; sub: string }> = {
    "login:identifier": { title: "Sign in", sub: "Enter your email and we'll send you a 6-digit code." },
    "login:otp": { title: "Verify it's you", sub: `Enter the 6-digit code sent to ${identifier}.` },
    "signup:identifier": {
      title: "Create account",
      sub: "Use your phone number or email to get started.",
    },
    "forgot:identifier": {
      title: "Reset password",
      sub: "We'll send a verification code to your phone or email.",
    },
    "signup:otp": { title: "Verify it's you", sub: `Enter the 6-digit code sent to ${identifier}.` },
    "forgot:otp": { title: "Verify it's you", sub: `Enter the 6-digit code sent to ${identifier}.` },
    "signup:username": { title: "Create username", sub: "This is how people find you on YourWorld." },
    "signup:password": { title: "Create password", sub: "At least 6 characters." },
    "forgot:newPassword": { title: "New password", sub: "Choose a new password for your account." },
    "signup:gender": { title: "Select gender", sub: "Optional — you can skip this." },
    "signup:photo": { title: "Add profile picture", sub: "Optional — you can skip this." },
    "forgot:done": { title: "Password updated", sub: "Your password was changed successfully." },
  };
  const copy = titles[`${flow}:${step}`] ?? { title: "YourWorld", sub: "" };

  const canGoBack = step !== "identifier" && step !== "done";

  return (
    <main className="grain relative min-h-screen">
      <div aria-hidden className="ambient-canvas" />
      <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6 py-12">
        <div className="flex items-center gap-2.5">
          {canGoBack ? (
            <button
              type="button"
              aria-label="Back"
              onClick={() => setStep(step === "otp" ? "identifier" : "otp")}
              className="grid h-9 w-9 place-items-center rounded-full bg-secondary"
            >
              <ArrowLeft size={16} />
            </button>
          ) : (
            <span className="logo-mark grid h-9 w-9 place-items-center rounded-[11px]">
              <span className="font-ui text-[12px] font-semibold leading-none tracking-[-0.02em]">
                YW
              </span>
            </span>
          )}
          <h1 className="font-ui text-[22px] font-semibold tracking-[-0.03em]">YourWorld</h1>
        </div>

        <h2 className="pt-7 font-display text-xl font-bold">{copy.title}</h2>
        <p className="pt-1.5 text-sm leading-relaxed text-muted-foreground">{copy.sub}</p>

        {/* IDENTIFIER */}
        {step === "identifier" && (
          <form onSubmit={sendOtp} className="space-y-3 pt-6">
            <div className="relative">
              <Input
                required
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setFieldError(null);
                }}
                placeholder="Phone number or email"
                aria-label="Phone number or email"
                autoComplete="username"
                inputMode={channel === "phone" ? "tel" : "email"}
                className="h-12 rounded-xl pr-11"
              />
              {channel && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-opacity"
                >
                  {channel === "phone" ? <Phone size={16} /> : <Mail size={16} />}
                </span>
              )}
            </div>
            {channel && (
              <p className="px-1 text-[11px] text-muted-foreground">
                {channel === "phone"
                  ? `We'll text a 6-digit code to ${identifierValid ? normalizePhone(identifier) : "your number"}.`
                  : "We'll email you a 6-digit code."}
              </p>
            )}
            {fieldError && (
              <p role="alert" className="px-1 text-[12px] leading-relaxed text-destructive">
                {fieldError}
              </p>
            )}
            <Button
              type="submit"
              disabled={busy || !identifierValid}
              className="h-12 w-full rounded-full"
            >
              {busy && <Loader2 size={16} className="mr-2 animate-spin" />}
              {busy ? "Sending code…" : usingPhone ? "Send SMS code" : "Send code"}
            </Button>
          </form>
        )}

        {/* OTP */}
        {step === "otp" && (
          <div className="space-y-4 pt-6">
            <InputOTP
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={code}
              onChange={(v) => {
                const digits = v.replace(/\D/g, "").slice(0, 6);
                setCode(digits);
                setFieldError(null);
                if (digits.length === 6) void verifyOtp(digits);
              }}
            >
              <InputOTPGroup className="w-full justify-between">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} className="h-12 w-11 rounded-xl text-base" />
                ))}
              </InputOTPGroup>
            </InputOTP>
            {fieldError && (
              <p role="alert" className="px-1 text-[12px] leading-relaxed text-destructive">
                {fieldError}
              </p>
            )}
            <Button
              type="button"
              disabled={busy || code.length !== 6}
              onClick={() => void verifyOtp(code)}
              className="h-12 w-full rounded-full"
            >
              {busy && <Loader2 size={16} className="mr-2 animate-spin" />}
              {busy ? "Verifying…" : "Verify"}
            </Button>
            <button
              type="button"
              disabled={busy}
              onClick={(e) => void sendOtp(e as unknown as React.FormEvent)}
              className="w-full text-center text-xs text-muted-foreground"
            >
              Didn't get it? <span className="font-semibold text-foreground">Resend code</span>
            </button>
          </div>
        )}

        {/* USERNAME */}
        {step === "username" && (
          <form onSubmit={saveUsername} className="space-y-3 pt-6">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                @
              </span>
              <Input
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.replace(/\s/g, ""));
                  setFieldError(null);
                }}
                placeholder="username"
                aria-label="Username"
                className="h-12 rounded-xl pl-8"
              />
            </div>
            {fieldError && (
              <p role="alert" className="px-1 text-[12px] leading-relaxed text-destructive">
                {fieldError}
              </p>
            )}
            <Button type="submit" disabled={busy} className="h-12 w-full rounded-full">
              {busy && <Loader2 size={16} className="mr-2 animate-spin" />}
              {busy ? "Checking…" : "Continue"}
            </Button>
          </form>
        )}

        {/* PASSWORD (signup) / NEW PASSWORD (forgot) */}
        {(step === "password" || step === "newPassword") && (
          <form onSubmit={savePassword} className="space-y-3 pt-6">
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldError(null);
              }}
              placeholder={step === "newPassword" ? "New password" : "Password"}
              aria-label={step === "newPassword" ? "New password" : "Password"}
              autoComplete="new-password"
              className="h-12 rounded-xl"
            />
            <Input
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setFieldError(null);
              }}
              placeholder="Confirm password"
              aria-label="Confirm password"
              autoComplete="new-password"
              className="h-12 rounded-xl"
            />
            {fieldError && (
              <p role="alert" className="px-1 text-[12px] leading-relaxed text-destructive">
                {fieldError}
              </p>
            )}
            <Button type="submit" disabled={busy} className="h-12 w-full rounded-full">
              {busy && <Loader2 size={16} className="mr-2 animate-spin" />}
              {busy ? "Saving…" : "Continue"}
            </Button>
          </form>
        )}

        {/* GENDER */}
        {step === "gender" && (
          <div className="space-y-3 pt-6">
            <div className="grid grid-cols-2 gap-2">
              {GENDERS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`h-12 rounded-xl px-3 text-sm transition ${
                    gender === g
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void saveProfileBits({ gender }, "photo")}
              className="h-12 w-full rounded-full"
            >
              Continue
            </Button>
            <button
              type="button"
              onClick={() => setStep("photo")}
              className="w-full text-center text-xs text-muted-foreground"
            >
              Skip
            </button>
          </div>
        )}

        {/* PHOTO */}
        {step === "photo" && (
          <div className="space-y-4 pt-6">
            <label className="mx-auto grid h-28 w-28 cursor-pointer place-items-center overflow-hidden rounded-full bg-secondary">
              {avatar ? (
                <img src={avatar} alt="Profile preview" className="h-full w-full object-cover" />
              ) : (
                <Camera size={22} className="text-muted-foreground" />
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void pickPhoto(e.target.files?.[0])}
              />
            </label>
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                avatar ? void saveProfileBits({ avatar_url: avatar }, "done") : setStep("done")
              }
              className="h-12 w-full rounded-full"
            >
              Enter Realsnap
            </Button>
            <button
              type="button"
              onClick={() => setStep("done")}
              className="w-full text-center text-xs text-muted-foreground"
            >
              Skip
            </button>
          </div>
        )}

        {/* DONE */}
        {step === "done" && (
          <div className="space-y-4 pt-6">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary">
              <Check size={22} />
            </div>
            {flow === "forgot" ? (
              <Button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  go("login");
                }}
                className="h-12 w-full rounded-full"
              >
                Back to login
              </Button>
            ) : (
              <Button type="button" onClick={finish} className="h-12 w-full rounded-full">
                Enter Realsnap
              </Button>
            )}
          </div>
        )}

        {/* FOOTER LINKS */}
        {step === "identifier" && (
          <div className="flex flex-col items-center gap-2 pt-5 text-xs text-muted-foreground">
            {flow === "login" && (
              <>
                <button type="button" onClick={() => go("forgot")}>
                  Forgot password?
                </button>
                <button type="button" onClick={() => go("signup")}>
                  No account? <span className="font-semibold text-foreground">Sign up</span>
                </button>
              </>
            )}
            {flow !== "login" && (
              <button type="button" onClick={() => go("login")}>
                Back to <span className="font-semibold text-foreground">sign in</span>
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
