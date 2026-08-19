import React, { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"input" | "verify">("input");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setStep("verify");
      toast.success("Code sent", { description: "Check your email for the 6-digit code." });
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Logged in successfully!");
      navigate({ to: "/chat" });
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] p-4">
      <Card className="w-full max-w-md bg-slate-900/80 border-slate-800 backdrop-blur-xl shadow-2xl text-slate-100">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/20 mb-2">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            YourWorld
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            {step === "input" ? "Enter your email to sign in or create an account" : `Enter the verification code sent to ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "input" ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-slate-950/50 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-pink-500 transition-all"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium py-2 rounded-lg shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-2"
              >
                {loading ? "Sending Code..." : "Send Code"} <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="relative">
                <CheckCircle2 className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="pl-10 text-center tracking-widest bg-slate-950/50 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-pink-500 transition-all"
                  maxLength={6}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium py-2 rounded-lg shadow-lg shadow-pink-500/25 transition-all"
              >
                {loading ? "Verifying..." : "Verify & Continue"}
              </Button>
              <button
                type="button"
                onClick={() => setStep("input")}
                className="w-full text-xs text-slate-400 hover:text-slate-200 transition-colors text-center mt-2"
              >
                Change Email
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
