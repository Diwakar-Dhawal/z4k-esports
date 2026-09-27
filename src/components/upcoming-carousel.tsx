import Link from "next/link";
import { TournamentThumb } from "@/components/esports-art";
import { UpcomingCarouselClient } from "./upcoming-carousel-client";

export interface UpcomingItem {
  slug: string;
  name: string;
  game: string;
  heroUrl: string | null;
  label: string;
}

/**
 * Server wrapper: renders the client carousel when there's something to show,
 * otherwise a static generic banner (linking to the first upcoming event if any).
 */
export function UpcomingCarousel({
  items,
  fallbackUrl,
}: {
  items: UpcomingItem[];
  fallbackUrl: string | null;
}) {
  if (items.length === 0) {
    return (
      <div className="relative h-[220px] overflow-hidden border-b border-zinc-800 sm:h-[280px] md:h-[320px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fallbackUrl ?? "/games/tournaments-hero.jpg"}
          alt="Z4K tournaments"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-red-400">
            Tournaments
          </p>
          <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-white sm:text-4xl">
            New battlegrounds announced soon
          </h2>
        </div>
      </div>
    );
  }

  return <UpcomingCarouselClient items={items} />;
}

export { Link };
