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

  useEffect(() => {
    // If already signed in, skip the form
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace(next);
    });
  }, [router, next]);

  async function signInWithEmail() {
    setLoading(true);
    setError(null);
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
          <span className="h-px flex-1 bg-zinc-800" /> staff sign-in{" "}
          <span className="h-px flex-1 bg-zinc-800" />
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
              autoComplete="email"
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
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === "Enter" && email && password) signInWithEmail();
              }}
            />
          </div>
          <Button
            onClick={signInWithEmail}
            disabled={loading || !email || !password}
            variant="secondary"
            className="w-full"
          >
            {loading ? <Spinner /> : null} Sign in with email
          </Button>
        </div>

        {error ? <div className="z4k-error text-left">{error}</div> : null}
        <p className="text-xs text-zinc-500">
          New here? Signing in with Google creates your player profile instantly. No
          account needed to register for tournaments.
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
