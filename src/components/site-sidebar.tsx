"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { Button, cn } from "@/components/ui";
import { MemberEmblem } from "@/components/esports-art";

function navItems(profile: Profile | null) {
  const staff = profile?.role === "admin" || profile?.role === "manager";
  return [
    { href: "/", label: "Home", icon: "🏠", show: true },
    { href: "/tournaments", label: "Tournaments", icon: "🏆", show: true },
    { href: "/team", label: "Team", icon: "🎮", show: true },
    { href: "/dashboard", label: "Dashboard", icon: "📊", show: Boolean(profile) },
    { href: "/profile", label: "Profile", icon: "👤", show: Boolean(profile) },
    { href: "/admin", label: "Control Room", icon: "⚙️", show: staff },
  ].filter((i) => i.show);
}

export function SiteSidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever the route changes.
  // Click-feedback spinner lives globally in <NavLoader/> so it covers
  // sidebar AND content links (tournament cards etc.).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  const items = navItems(profile);

  const navList = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {items.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
              active
                ? "bg-red-600/15 text-red-300 border border-red-600/30"
                : "text-zinc-400 hover:bg-zinc-800/70 hover:text-white border border-transparent",
            )}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const userBlock = profile ? (
    <div className="border-t border-zinc-800 p-3">
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-lg bg-zinc-900/70 p-2">
          <MemberEmblem
            name={profile.full_name ?? profile.email}
            photoUrl={profile.avatar_url}
            size={36}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">
              {profile.full_name ?? "Player"}
            </p>
            <p className="truncate text-xs capitalize text-red-400">{profile.role}</p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={signOut} className="w-full">
          Sign out
        </Button>
      </div>
    </div>
  ) : null;

  const signInTop = profile ? null : (
    <div className="px-3 pb-1 pt-3">
      <Link href="/login">
        <Button size="sm" className="w-full">Sign in</Button>
      </Link>
    </div>
  );

  const brand = (
    <Link href="/" className="flex items-center gap-2 px-5 py-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-xs font-black text-white">
        Z4K
      </span>
      <span className="text-sm font-black uppercase tracking-widest text-white">
        Esports
      </span>
    </Link>
  );

  return (
    <>
      {/* Mobile top bar: wordmark left, hamburger right */}
      <div className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-4 backdrop-blur md:hidden">
        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400">
          Z4K ESPORTS
        </span>
        <div className="flex items-center gap-2">
          {!profile ? (
            <Link
              href="/login"
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500"
            >
              Sign in
            </Link>
          ) : null}
          <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-2.5 text-zinc-300 hover:bg-zinc-800"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-black/70 transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setOpen(false)}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 flex w-64 flex-col border-r border-zinc-800 bg-zinc-950 transition-transform duration-200",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {brand}
          {signInTop}
          {navList}
          {userBlock}
        </aside>
      </div>

      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-zinc-800 bg-zinc-950 md:flex">
        {brand}
        {signInTop}
        {navList}
        {userBlock}
      </aside>
    </>
  );
}
