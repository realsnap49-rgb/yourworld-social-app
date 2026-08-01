import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Mode = "login" | "signup" | "forgot";

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

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: redirect && redirect.startsWith("/") ? redirect : "/", replace: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Account created");
          navigate({ to: "/", replace: true });
        } else {
          setSent("Check your email to confirm your account, then sign in.");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("Password reset link sent. Check your inbox.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grain relative min-h-screen">
      <div aria-hidden className="ambient-canvas" />
      <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6 py-12">
        <div className="flex items-center gap-2.5">
          <span className="logo-mark grid h-9 w-9 place-items-center rounded-[11px]">
            <span className="font-ui text-[12px] font-semibold leading-none tracking-[-0.02em]">
              YW
            </span>
          </span>
          <h1 className="font-ui text-[22px] font-semibold tracking-[-0.03em]">YourWorld</h1>
        </div>

        <h2 className="pt-7 font-display text-xl font-bold">
          {mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}
        </h2>
        <p className="pt-1.5 text-sm leading-relaxed text-muted-foreground">
          {mode === "login"
            ? "Sign in to continue to your world."
            : mode === "signup"
              ? "Join YourWorld in a few seconds."
              : "We'll email you a link to set a new password."}
        </p>

        {sent ? (
          <p className="mt-6 rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
            {sent}
          </p>
        ) : null}

        <form onSubmit={submit} className="space-y-3 pt-6">
          {mode === "signup" && (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
              aria-label="Display name"
              autoComplete="name"
              className="h-12 rounded-xl"
            />
          )}
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            aria-label="Email"
            autoComplete="email"
            className="h-12 rounded-xl"
          />
          {mode !== "forgot" && (
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              aria-label="Password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="h-12 rounded-xl"
            />
          )}
          <Button type="submit" disabled={busy} className="h-12 w-full rounded-full">
            {mode === "login" ? "Sign in" : mode === "signup" ? "Sign up" : "Send reset link"}
          </Button>
        </form>

        <div className="flex flex-col items-center gap-2 pt-5 text-xs text-muted-foreground">
          {mode === "login" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setSent(null);
                }}
              >
                Forgot password?
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setSent(null);
                }}
              >
                No account? <span className="font-semibold text-foreground">Sign up</span>
              </button>
            </>
          )}
          {mode !== "login" && (
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setSent(null);
              }}
            >
              Back to <span className="font-semibold text-foreground">sign in</span>
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
