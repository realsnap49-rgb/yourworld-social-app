import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — YourWorld" },
      { name: "description", content: "Choose a new password for your YourWorld account." },
      { property: "og:title", content: "Set a new password — YourWorld" },
      { property: "og:description", content: "Choose a new password for your YourWorld account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: {}, replace: true });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
      <h1 className="font-display text-xl font-bold">Set a new password</h1>
      <p className="pt-1.5 text-sm text-muted-foreground">
        Enter a new password for your account.
      </p>
      <form onSubmit={submit} className="space-y-3 pt-6">
        <Input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          aria-label="New password"
          autoComplete="new-password"
          className="h-12 rounded-xl"
        />
        <Button type="submit" disabled={busy} className="h-12 w-full rounded-full">
          Update password
        </Button>
      </form>
    </main>
  );
}
