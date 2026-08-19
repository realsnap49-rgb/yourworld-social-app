import React, { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Mail, Phone, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"input" | "verify">("input");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Social Logins
  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    setLoading(false);
    if (error) toast.error(error.message);
  };

  // Send OTP
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return;
    setLoading(true);

    const isEmail = identifier.includes("@");
    const { error } = isEmail 
      ? await supabase.auth.signInWithOtp({ email: identifier })
      : await supabase.auth.signInWithOtp({ phone: identifier });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setStep("verify");
      toast.success(`6-digit code sent to ${identifier}`);
    }
  };

  // Verify OTP
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setLoading(true);

    const isEmail = identifier.includes("@");
    const { error } = await supabase.auth.verifyOtp({
      [isEmail ? 'email' : 'phone']: identifier,
      token: code,
      type: isEmail ? 'email' : 'sms',
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome! Login Successful.");
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
            World-class fast & secure authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "input" ? (
            <>
              {/* One-Tap Social Logins */}
              <div className="space-y-2">
                <Button
                  onClick={() => handleSocialLogin('google')}
                  variant="outline"
                  className="w-full bg-slate-950/40 border-slate-800 text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/><path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-2.9z"/><path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/></svg>
                  Continue with Google
                </Button>
                <Button
                  onClick={() => handleSocialLogin('apple')}
                  variant="outline"
                  className="w-full bg-slate-950/40 border-slate-800 text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170"><path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.82.13-9.62-1.95-14.42-6.23-3.23-2.82-7.17-7.53-11.83-14.13-6.3-8.91-11.35-18.78-15.15-29.61-3.8-10.83-5.7-21.2-5.7-31.1 0-14.83 3.82-27.17 11.47-37.03 7.65-9.85 17.38-14.88 29.18-15.08 4.7 0 9.87 1.18 15.52 3.53 5.65 2.35 9.58 3.53 11.78 3.53 2.08 0 6.08-1.22 12-3.66 5.92-2.44 11.02-3.56 15.3-3.35 11.53.53 20.82 4.8 27.87 12.82-10.23 6.18-15.22 14.82-14.97 25.92.25 8.7 3.49 16.03 9.72 22 6.23 5.97 13.79 9.17 22.68 9.6-2.58 7.72-5.92 15.33-10.02 22.82zM119.22 31.85c0-6.95 2.52-13.62 7.57-20.02 5.05-6.4 11.45-10.45 19.2-12.15.28 2.03.42 3.88.42 5.55 0 7.07-2.6 13.88-7.8 20.43-5.2 6.55-11.62 10.55-19.27 12-0.08-1.63-0.12-3.23-0.12-4.81z"/></svg>
                  Continue with Apple
                </Button>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-4 text-xs text-slate-500 uppercase">Or Continue With</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <form onSubmit={handleSendCode} className="space-y-3">
                <div className="relative">
                  {identifier.includes("@") ? (
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                  ) : (
                    <Phone className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                  )}
                  <Input
                    type="text"
                    placeholder="Enter Phone Number or Email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-10 bg-slate-950/50 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-pink-500 transition-all"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium py-2 rounded-lg shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? "Sending Code..." : "Send Verification Code"} <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            </>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="pl-10 text-center tracking-widest bg-slate-950/50 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-pink-500 transition-all"
                  maxLength={6}
                  autoComplete="one-time-code"
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
                Change Phone / Email
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
