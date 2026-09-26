"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/components/ui";
import type { LandingSlide } from "@/lib/types";

const FALLBACK = [
  { title: "Battlegrounds Mobile India", tagline: "BGMI · Battle Royale", image_url: "/games/bgmi.jpg" },
  { title: "Valorant", tagline: "Tactical FPS · 5v5", image_url: "/games/valorant.jpg" },
  { title: "Counter-Strike 2", tagline: "Tactical FPS · 5v5", image_url: "/games/csgo.jpg" },
  { title: "Call of Duty: Mobile", tagline: "CODM · Multiplayer", image_url: "/games/codm.jpg" },
  { title: "Free Fire MAX", tagline: "Battle Royale", image_url: "/games/freefire.jpg" },
  { title: "eFootball", tagline: "Sports · 1v1", image_url: "/games/efootball.jpg" },
];

export function GameCarousel({
  slides,
  asBackground = false,
}: {
  slides?: LandingSlide[];
  asBackground?: boolean;
}) {
  const items = slides && slides.length > 0
    ? slides.map((s) => ({ title: s.title, tagline: s.tagline, image_url: s.image_url }))
    : FALLBACK;
  return <Carousel items={items} asBackground={asBackground} />;
}

function Carousel({
  items,
  asBackground,
}: {
  items: Array<{ title: string; tagline: string; image_url: string }>;
  asBackground: boolean;
}) {
  const [index, setIndex] = useState(0);
  const next = useCallback(() => setIndex((i) => (i + 1) % items.length), [items.length]);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(next, 4500);
    return () => clearInterval(t);
  }, [items.length, next]);

  if (asBackground) {
    return (
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="flex h-full transition-transform duration-1000 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {items.map((g) => (
            <div key={g.image_url} className="relative h-full min-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.image_url} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="z4k-container py-14">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800">
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {items.map((g) => (
            <div key={g.image_url} className="relative min-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={g.image_url}
                alt={g.title}
                className="aspect-[16/9] w-full object-cover sm:aspect-[21/9]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-4 sm:p-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-400 sm:text-xs sm:tracking-[0.3em]">
                  {g.tagline}
                </p>
                <h3 className="mt-1 text-xl font-black uppercase tracking-tight text-white sm:text-4xl">
                  {g.title}
                </h3>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}
          aria-label="Previous game"
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-white opacity-70 transition-opacity hover:opacity-100"
        >
          ‹
        </button>
        <button
          onClick={next}
          aria-label="Next game"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-white opacity-70 transition-opacity hover:opacity-100"
        >
          ›
        </button>

        <div className="absolute bottom-4 right-5 flex gap-1.5">
          {items.map((g, i) => (
            <button
              key={g.image_url}
              onClick={() => setIndex(i)}
              aria-label={`Go to ${g.title}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-6 bg-red-500" : "w-1.5 bg-white/40 hover:bg-white/70",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
