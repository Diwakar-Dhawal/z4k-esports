"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TournamentThumb } from "@/components/esports-art";
import { cn } from "@/components/ui";
import type { UpcomingItem } from "./upcoming-carousel";

export function UpcomingCarouselClient({ items }: { items: UpcomingItem[] }) {
  const [index, setIndex] = useState(0);
  const next = useCallback(() => setIndex((i) => (i + 1) % items.length), [items.length]);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [items.length, next]);

  if (items.length === 1) {
    const it = items[0];
    return (
      <Link href={`/tournaments/${it.slug}`} className="relative block overflow-hidden border-b border-zinc-800">
        <TournamentThumb name={it.name} game={it.game} heroUrl={it.heroUrl} showText={false} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 p-5 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-red-400">{it.label}</p>
          <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white sm:text-4xl">
            {it.name}
          </h2>
          <p className="mt-2 text-sm text-zinc-300">{it.game}</p>
        </div>
      </Link>
    );
  }

  return (
    <div className="relative overflow-hidden border-b border-zinc-800">
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {items.map((it) => (
          <Link
            key={it.slug}
            href={`/tournaments/${it.slug}`}
            className="relative block min-w-full"
          >
            <TournamentThumb name={it.name} game={it.game} heroUrl={it.heroUrl} showText={false} />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 p-5 sm:p-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-400 sm:text-xs sm:tracking-[0.3em]">
                {it.label}
              </p>
              <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white sm:text-4xl">
                {it.name}
              </h2>
              <p className="mt-2 text-sm text-zinc-300">{it.game}</p>
            </div>
          </Link>
        ))}
      </div>

      <button
        onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}
        aria-label="Previous tournament"
        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-white opacity-70 transition-opacity hover:opacity-100"
      >
        ‹
      </button>
      <button
        onClick={next}
        aria-label="Next tournament"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-white opacity-70 transition-opacity hover:opacity-100"
      >
        ›
      </button>

      <div className="absolute bottom-4 right-5 flex gap-1.5">
        {items.map((it, i) => (
          <button
            key={it.slug}
            onClick={() => setIndex(i)}
            aria-label={`Go to ${it.name}`}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === index ? "w-6 bg-red-500" : "w-1.5 bg-white/40 hover:bg-white/70",
            )}
          />
        ))}
      </div>
    </div>
  );
}
