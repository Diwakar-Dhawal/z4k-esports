import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { QuoteTicker } from "@/components/quote-ticker";
import { GameCarousel } from "@/components/game-carousel";
import { TournamentCard } from "@/components/tournament-card";
import { MemberEmblem } from "@/components/esports-art";
import { Button, SectionTitle, EmptyState } from "@/components/ui";
import type { Tournament, MemberCategory, TeamMember, LandingSlide } from "@/lib/types";

interface SlotCount {
  tournament_id: string;
  approved: number;
  pending: number;
}

export default async function HomePage() {
  const supabase = await createClient();

  const [contentRes, tournamentsRes, slotsRes, categoriesRes, membersRes, slidesRes] =
    await Promise.all([
      supabase
        .from("content_blocks")
        .select("*")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("tournaments")
        .select("*")
        .is("archived_at", null)
        .order("event_starts_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(9),
      supabase.rpc("slot_counts"),
      supabase.from("member_categories").select("*").order("sort_order"),
      supabase
        .from("team_members")
        .select("*")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("landing_slides")
        .select("*")
        .eq("is_active", true)
        .order("sort_order"),
    ]);

  const content = (contentRes.data ?? []) as Array<{
    kind: string;
    key: string | null;
    body: string;
  }>;
  const tournaments = (tournamentsRes.data ?? []) as Tournament[];
  const slots = ((slotsRes.data ?? []) as SlotCount[]) ?? [];
  const categories = (categoriesRes.data ?? []) as MemberCategory[];
  const members = (membersRes.data ?? []) as TeamMember[];
  const slides = (slidesRes.data ?? []) as LandingSlide[];

  const taglines = Object.fromEntries(
    content.filter((c) => c.kind === "tagline" && c.key).map((c) => [c.key!, c.body]),
  );
  const quotes = content.filter((c) => c.kind === "quote").map((c) => c.body);
  const aboutBlock = content.find((c) => c.key === "about_org")?.body;

  const slotMap = new Map(slots.map((s) => [s.tournament_id, s]));
  const withSlots = tournaments.map((t) => ({
    t,
    approved: slotMap.get(t.id)?.approved ?? 0,
    pending: slotMap.get(t.id)?.pending ?? 0,
  }));

  function tournamentStatusOf(t: Tournament) {
    if (
      t.status_override === "upcoming" ||
      t.status_override === "ongoing" ||
      t.status_override === "completed"
    ) {
      return t.status_override;
    }
    const now = Date.now();
    const starts = t.event_starts_at ? new Date(t.event_starts_at).getTime() : null;
    const ends = t.event_ends_at ? new Date(t.event_ends_at).getTime() : null;
    if (starts && now < starts) return "upcoming" as const;
    if (ends && now > ends) return "completed" as const;
    return "ongoing" as const;
  }

  const sections = [
    { key: "ongoing" as const, title: "Live Now" },
    { key: "upcoming" as const, title: "Upcoming" },
    { key: "completed" as const, title: "Past Tournaments" },
  ];

  // Roster preview: one emblem per category (ownership first)
  const rosterPreview = categories
    .slice(0, 4)
    .map((cat) => ({
      cat,
      member: members.find((m) => m.category_id === cat.id),
    }))
    .filter((x) => x.member);

  return (
    <>
      {/* Hero with games slideshow behind */}
      <section className="relative overflow-hidden">
        <GameCarousel slides={slides} asBackground />
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/70 via-zinc-950/40 to-zinc-950" />
        <div className="z4k-container relative flex flex-col items-center gap-6 px-4 py-20 text-center sm:py-28">
          <span className="rounded-full border border-red-500/40 bg-black/50 px-4 py-1 text-xs font-bold uppercase tracking-[0.25em] text-red-400 backdrop-blur-sm">
            Z4K Esports
          </span>
          <h1 className="max-w-3xl text-4xl font-black uppercase leading-tight tracking-tight text-white drop-shadow-lg sm:text-6xl">
            {taglines["hero_title"] ?? "FORGE YOUR LEGEND"}
          </h1>
          <p className="max-w-xl text-base text-zinc-200 drop-shadow sm:text-lg">
            {taglines["hero_subtitle"] ??
              "Z4K Esports — where raw talent meets ruthless discipline."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/tournaments">
              <Button>Browse tournaments</Button>
            </Link>
            <Link href="/team">
              <Button variant="secondary">Meet the roster</Button>
            </Link>
          </div>
        </div>
      </section>

      <QuoteTicker quotes={quotes} />

      {/* Tournaments */}
      <section className="z4k-container py-14">
        <SectionTitle sub="Past, present and future battlegrounds — all in one place.">
          Tournaments
        </SectionTitle>
        <div className="space-y-10">
          {sections.map(({ key, title }) => {
            const list = withSlots
              .filter(({ t }) => tournamentStatusOf(t) === key)
              .slice(0, 3);
            const total = withSlots.filter(
              ({ t }) => tournamentStatusOf(t) === key,
            ).length;
            return (
              <div key={key}>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400">
                  {title}
                  <span className="text-zinc-600">({total})</span>
                </h3>
                {list.length === 0 ? (
                  <EmptyState>Nothing here yet — stay locked in.</EmptyState>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {list.map(({ t, approved, pending }) => (
                      <TournamentCard
                        key={t.id}
                        t={t}
                        approved={approved}
                        pending={pending}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-8">
          <Link href="/tournaments" className="text-sm font-semibold text-red-400 hover:text-red-300">
            View all tournaments →
          </Link>
        </div>
      </section>

      {/* Roster preview */}
      <section className="border-t border-zinc-800 bg-zinc-950/40 py-14">
        <div className="z4k-container">
          <SectionTitle sub={aboutBlock ?? undefined}>The Roster</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {rosterPreview.map(({ cat, member }) => (
              <div key={cat.id} className="z4k-card p-4">
                <div className="flex items-center gap-3">
                  <MemberEmblem
                    name={member!.name}
                    tag={member!.tag}
                    photoUrl={member!.photo_url}
                    size={48}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{member!.name}</p>
                    <p className="truncate text-xs uppercase tracking-widest text-red-400">
                      {cat.name}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link href="/team" className="text-sm font-semibold text-red-400 hover:text-red-300">
              Meet the full roster →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
