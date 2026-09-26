"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Spinner } from "@/components/ui";

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? "/dashboard";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // If already signed in, skip the form
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace(next);
    });
  }, [router, next]);

  async function signUpWithEmail() {
    setLoading(true);
    setError(null);
    setMsg(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.session) {
      router.replace(next);
      router.refresh();
    } else {
      setMsg("Check your inbox to confirm the email, then sign in.");
      setLoading(false);
    }
  }

  async function signInWithEmail() {
    setLoading(true);
    setError(null);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="z4k-container flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-sm space-y-5 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 text-sm font-black text-white">
          Z4K
        </span>
        <div>
          <h1 className="text-xl font-black uppercase tracking-wide text-white">
            Sign in to Z4K
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Register teams, manage presets and track your tournaments.
          </p>
        </div>
        <Button onClick={signInWithGoogle} disabled={loading} className="w-full">
          {loading ? <Spinner /> : null}
          {loading ? "Redirecting…" : "Continue with Google"}
        </Button>

        <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-zinc-600">
          <span className="h-px flex-1 bg-zinc-800" /> or email <span className="h-px flex-1 bg-zinc-800" />
        </div>

        <div className="space-y-3 text-left">
          <div>
            <label className="z4k-label">Email</label>
            <input
              className="z4k-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="z4k-label">Password</label>
            <input
              className="z4k-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={(e) => {
                if (e.key === "Enter" && email && password) mode === "signin" ? signInWithEmail() : signUpWithEmail();
              }}
            />
          </div>
          <div className="flex gap-2">
            {mode === "signin" ? (
              <>
                <Button onClick={signInWithEmail} disabled={loading || !email || !password} className="flex-1">
                  {loading ? <Spinner /> : null} Sign in
                </Button>
                <Button variant="ghost" onClick={() => setMode("signup")} disabled={loading}>
                  Create account
                </Button>
              </>
            ) : (
              <>
                <Button onClick={signUpWithEmail} disabled={loading || !email || !password} className="flex-1">
                  {loading ? <Spinner /> : null} Create account
                </Button>
                <Button variant="ghost" onClick={() => setMode("signin")} disabled={loading}>
                  Back to sign in
                </Button>
              </>
            )}
          </div>
        </div>

        {msg ? <div className="z4k-success text-left">{msg}</div> : null}
        {error ? <div className="z4k-error text-left">{error}</div> : null}
        <p className="text-xs text-zinc-500">
          New here? Signing in creates your player profile instantly.
        </p>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
