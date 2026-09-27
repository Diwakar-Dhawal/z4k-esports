"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Scrolls to #hash anchors after async page content has rendered.
 * Needed because server pages hydrate in two passes — the anchor often
 * doesn't exist yet when the browser would normally perform hash scroll.
 */
export function HashScroll() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    // Two frames: let the server-rendered content mount first
    const t = setTimeout(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
    }, 250);
    return () => clearTimeout(t);
  }, [pathname, searchParams]);

  return null;
}
