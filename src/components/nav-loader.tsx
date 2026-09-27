"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";

/**
 * Global navigation loader. Two jobs:
 * 1. Renders a centered spinner overlay the moment a link click is
 *    registered (setNavigating), so clicks always feel acknowledged —
 *    including tournament-card navigations, not just the sidebar.
 * 2. Guarantees the overlay is cleared once the route changes (the
 *    sidebar's own pending-state does the same for its links).
 */
export function NavLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navigating, setNavigating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Any route change clears the state
  useEffect(() => {
    setNavigating(false);
  }, [pathname, searchParams]);

  // Intercept in-app link clicks: show the overlay immediately
  useEffect(() => {
    if (!mounted) return;
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const a = (e.target as HTMLElement)?.closest?.("a[href]");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("/") || href.startsWith("//")) return; // internal only
      setNavigating(true);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [mounted]);

  // Failsafe: never stuck longer than 6s (e.g. aborted nav)
  useEffect(() => {
    if (!navigating) return;
    const t = setTimeout(() => setNavigating(false), 6000);
    return () => clearTimeout(t);
  }, [navigating]);

  if (!mounted || !navigating) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-[2px]"
      role="status"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-red-500" />
        <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-400">
          Loading
        </span>
      </div>
    </div>,
    document.body,
  );
}
