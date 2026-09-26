import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TournamentCard } from "@/components/tournament-card";
import { TournamentThumb } from "@/components/esports-art";
import { UpcomingCarousel } from "@/components/upcoming-carousel";
import { EmptyState } from "@/components/ui";
import { tournamentStatus, type TournamentStatus } from "@/lib/tournament-utils";
import type { Tournament } from "@/lib/types";

export const metadata: Metadata = { title: "Tournaments" };

interface SlotCount {
  tournament_id: string;
  approved: number;
  pending: number;
}

const FILTERS: Array<{ key: TournamentStatus | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "ongoing", label: "Live Now" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Past" },
];

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = (FILTERS.find((f) => f.key === status)?.key ?? "all") as
    | TournamentStatus
    | "all";

  const supabase = await createClient();
  const [tournamentsRes, slotsRes, heroRes] = await Promise.all([
    supabase
      .from("tournaments")
      .select("*")
      .is("archived_at", null)
      .order("event_starts_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.rpc("slot_counts"),
    supabase.from("site_media").select("url").eq("slot", "tournaments_hero").maybeSingle(),
  ]);

  const tournaments = (tournamentsRes.data ?? []) as Tournament[];
  const slots = ((slotsRes.data ?? []) as SlotCount[]) ?? [];
  const slotMap = new Map(slots.map((s) => [s.tournament_id, s]));

  const groups: Record<TournamentStatus, Tournament[]> = {
    ongoing: [],
    upcoming: [],
    completed: [],
  };
  for (const t of tournaments) {
    groups[tournamentStatus(t)].push(t);
  }
  groups.completed.reverse();

  const featured = tournaments.find(
    (t) => tournamentStatus(t) === "upcoming" || tournamentStatus(t) === "ongoing",
  );
  const heroUrl = (heroRes.data as { url: string } | null)?.url ?? null;

  const visible =
    active === "all"
      ? [
          { title: "Live Now", items: groups.ongoing },
          { title: "Upcoming", items: groups.upcoming },
          { title: "Past", items: groups.completed },
        ]
      : [
          {
            title: FILTERS.find((f) => f.key === active)!.label,
            items: groups[active],
          },
        ];

  return (
    <div className="pb-14">
      {/* Upcoming tournaments carousel (falls back to generic banner) */}
      {active === "all" ? (
        <UpcomingCarousel
          items={[
            ...groups.ongoing.map((t) => ({
              slug: t.slug,
              name: t.name,
              game: t.game,
              heroUrl: t.hero_image_url,
              label: "🔴 Live now",
            })),
            ...groups.upcoming.map((t) => ({
              slug: t.slug,
              name: t.name,
              game: t.game,
              heroUrl: t.hero_image_url,
              label: "Next up",
            })),
          ]}
          fallbackUrl={heroUrl}
        />
      ) : null}

      <div className="z4k-container pt-10">
        <h1 className="text-3xl font-black uppercase tracking-tight text-white">
          Tournaments
        </h1>

        <div className="mt-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? "/tournaments" : `/tournaments?status=${f.key}`}
              className={
                active === f.key
                  ? "rounded-full border border-red-500/40 bg-red-600/20 px-4 py-1.5 text-sm font-semibold text-red-300"
                  : "rounded-full border border-zinc-700 px-4 py-1.5 text-sm font-semibold text-zinc-400 hover:border-zinc-500 hover:text-white"
              }
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="mt-8 space-y-10">
          {visible.map((g) => (
            <div key={g.title}>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-zinc-400">
                {g.title} <span className="text-zinc-600">({g.items.length})</span>
              </h3>
              {g.items.length === 0 ? (
                <EmptyState>Nothing here yet.</EmptyState>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {g.items.map((t) => (
                    <TournamentCard
                      key={t.id}
                      t={t}
                      approved={slotMap.get(t.id)?.approved ?? 0}
                      pending={slotMap.get(t.id)?.pending ?? 0}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
