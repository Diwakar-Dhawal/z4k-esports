"use client";

import { useEffect, useState } from "react";

export function QuoteTicker({ quotes }: { quotes: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (quotes.length < 2) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % quotes.length);
    }, 6000);
    return () => clearInterval(t);
  }, [quotes.length]);

  if (quotes.length === 0) return null;

  return (
    <div className="border-y border-zinc-800 bg-zinc-950/60">
      <div className="z4k-container flex items-center gap-3 py-3">
        <span className="shrink-0 text-xs font-black uppercase tracking-widest text-red-500">
          Z4K Says
        </span>
        <p
          key={index}
          className="truncate text-sm italic text-zinc-300 transition-opacity duration-500"
        >
          “{quotes[index]}”
        </p>
      </div>
    </div>
  );
}
