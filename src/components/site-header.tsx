"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { Button, cn } from "@/components/ui";

export function SiteHeader({ profile }: { profile: Profile | null }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const staff = profile?.role === "admin" || profile?.role === "manager";

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  const links = [
    { href: "/", label: "Home" },
    { href: "/#team", label: "Team" },
    { href: "/#tournaments", label: "Tournaments" },
    { href: "/tournaments", label: "All Tournaments" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="z4k-container flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-red-600 text-xs font-black text-white">
            Z4K
          </span>
          <span className="text-sm font-black uppercase tracking-widest text-white">
            Esports
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {profile ? (
            <>
              {staff ? (
                <Link href="/admin">
                  <Button size="sm" variant="secondary">Admin</Button>
                </Link>
              ) : null}
              <Link href="/dashboard">
                <Button size="sm" variant="secondary">Dashboard</Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </div>

        <button
          className="rounded-md p-2 text-zinc-300 hover:bg-zinc-800 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      <div className={cn("border-t border-zinc-800 md:hidden", open ? "block" : "hidden")}>
        <div className="z4k-container flex flex-col gap-1 py-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2">
            {profile ? (
              <>
                {staff ? (
                  <Link href="/admin" onClick={() => setOpen(false)}>
                    <Button size="sm" variant="secondary" className="w-full">Admin</Button>
                  </Link>
                ) : null}
                <Link href="/dashboard" onClick={() => setOpen(false)}>
                  <Button size="sm" variant="secondary" className="w-full">Dashboard</Button>
                </Link>
                <Button size="sm" variant="ghost" onClick={signOut}>Sign out</Button>
              </>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button size="sm" className="w-full">Sign in</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
