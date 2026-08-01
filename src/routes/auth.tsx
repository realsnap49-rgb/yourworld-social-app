import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Camera, Check } from "lucide-react";
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

  const usingPhone = isPhone(identifier) && !isEmail(identifier);

  const go = (f: Flow) => {
    setFlow(f);
    setStep("identifier");
    setCode("");
    setPassword("");
    setConfirm("");
  };

  const finish = () => {
    navigate({ to: redirect && redirect.startsWith("/") ? redirect : "/", replace: true });
  };

  const fail = (err: unknown) =>
    toast.error(err instanceof Error ? err.message : "Something went wrong");

  /* ---------- actions ---------- */

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const creds = usingPhone
        ? { phone: normalizePhone(identifier), password }
        : { email: identifier.trim(), password };
      const { error } = await supabase.auth.signInWithPassword(creds);
      if (error) throw error;
      toast.success("Welcome back");
      finish();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmail(identifier) && !isPhone(identifier)) {
      toast.error("Enter a valid phone number or email");
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
            options: { shouldCreateUser, emailRedirectTo: window.location.origin },
          });
      if (error) throw error;
      toast.success(`Code sent to ${usingPhone ? normalizePhone(identifier) : identifier.trim()}`);
      setCode("");
      setStep("otp");
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (value: string) => {
    setBusy(true);
    try {
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
      setStep(flow === "signup" ? "username" : "newPassword");
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const saveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const handle = username.trim().toLowerCase();
    if (!/^[a-z0-9._]{3,20}$/.test(handle)) {
      toast.error("3–20 characters: letters, numbers, dot or underscore");
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
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
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

  const saveProfileBits = async (patch: Record<string, string | null>, next: Step) => {
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
    "login:identifier": { title: "Sign in", sub: "Sign in to continue to your world." },
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
          <form onSubmit={flow === "login" ? login : sendOtp} className="space-y-3 pt-6">
            <Input
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Phone number or email"
              aria-label="Phone number or email"
              autoComplete="username"
              className="h-12 rounded-xl"
            />
            {flow === "login" && (
              <Input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                aria-label="Password"
                autoComplete="current-password"
                className="h-12 rounded-xl"
              />
            )}
            <Button type="submit" disabled={busy} className="h-12 w-full rounded-full">
              {flow === "login" ? "Continue" : "Send code"}
            </Button>
          </form>
        )}

        {/* OTP */}
        {step === "otp" && (
          <div className="space-y-4 pt-6">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(v) => {
                setCode(v);
                if (v.length === 6) void verifyOtp(v);
              }}
            >
              <InputOTPGroup className="w-full justify-between">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} className="h-12 w-11 rounded-xl text-base" />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <Button
              type="button"
              disabled={busy || code.length !== 6}
              onClick={() => void verifyOtp(code)}
              className="h-12 w-full rounded-full"
            >
              Verify
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
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                placeholder="username"
                aria-label="Username"
                className="h-12 rounded-xl pl-8"
              />
            </div>
            <Button type="submit" disabled={busy} className="h-12 w-full rounded-full">
              Continue
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
              onChange={(e) => setPassword(e.target.value)}
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
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm password"
              aria-label="Confirm password"
              autoComplete="new-password"
              className="h-12 rounded-xl"
            />
            <Button type="submit" disabled={busy} className="h-12 w-full rounded-full">
              Continue
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
