import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, isStaff } from "@/lib/supabase/profile";
import { RegistrationForm } from "./registration-form";
import { SlotsPanel } from "./slots-panel";
import { TournamentThumb } from "@/components/esports-art";
import { Badge, Button, Card, EmptyState, SectionTitle } from "@/components/ui";
import {
  fmtDateTime,
  isRegistrationOpen,
  regState,
  renderSimpleMarkdown,
  tournamentStatus,
  waMeLink,
  youtubeEmbed,
} from "@/lib/tournament-utils";
import type {
  Tournament,
  TournamentResult,
  TournamentPhoto,
  TournamentAward,
  Registration,
  RoomCredential,
} from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournaments")
    .select("name, game, description")
    .eq("slug", slug)
    .single();
  if (!data) return { title: "Tournament" };
  return {
    title: data.name,
    description: data.description ?? `${data.name} — ${data.game}`,
  };
}

const statusTone = { upcoming: "blue", ongoing: "green", completed: "gray" } as const;

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const profile = await getProfile();

  const { data: tData } = await supabase
    .from("tournaments")
    .select("*")
    .eq("slug", slug)
    .single();
  if (!tData || (tData.archived_at && !isStaff(profile))) notFound();
  const t = tData as Tournament;

  const [resultsRes, photosRes, awardsRes, slotsRes, slotsListRes, myRegRes, roomRes] =
    await Promise.all([
      supabase.from("tournament_results").select("*").eq("tournament_id", t.id).order("placement"),
      supabase.from("tournament_photos").select("*").eq("tournament_id", t.id).order("sort_order"),
      supabase.from("tournament_awards").select("*").eq("tournament_id", t.id).order("sort_order"),
      supabase.rpc("slot_counts").then((r) =>
        (r.data ?? []).find((s: { tournament_id: string }) => s.tournament_id === t.id) ?? {
          approved: 0,
          pending: 0,
        },
      ),
      supabase.rpc("public_slots", { p_tournament_id: t.id }),
      profile
        ? supabase
            .from("registrations")
            .select("id, status, team_name")
            .eq("tournament_id", t.id)
            .eq("user_id", profile.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("room_credentials")
        .select("*")
        .eq("tournament_id", t.id)
        .order("sort_order"),
    ]);

  const results = (resultsRes.data ?? []) as TournamentResult[];
  const photos = (photosRes.data ?? []) as TournamentPhoto[];
  const awards = (awardsRes.data ?? []) as TournamentAward[];
  const slotCounts = slotsRes as { approved: number; pending: number };
  const publicSlots = (slotsListRes.data ?? []) as Array<{
    team_name: string;
    team_tag: string | null;
    whatsapp: string;
    approved_at: string;
  }>;
  const myReg = (myRegRes.data ?? null) as Pick<
    Registration,
    "id" | "status" | "team_name"
  > | null;
  const roomCreds = (roomRes.data ?? []) as RoomCredential[];

  const status = tournamentStatus(t);
  const regOpen = isRegistrationOpen(t);
  const reg = regState(t);
  const isCaptain = myReg?.status === "approved";
  const nowRevealed = roomCreds.filter((c) => new Date(c.reveal_at) <= new Date());

  const waMessage = `Hi, I'm the captain of team "${
    myReg?.team_name ?? ""
  }" registered for ${t.name} on Z4K Esports.`;

  return (
    <div className="z4k-container py-10">
      {/* Banner — capped height so it never dwarfs the page */}
      <div className="mb-6 h-[220px] overflow-hidden rounded-xl border border-zinc-800 sm:h-[280px] md:h-[340px]">
        <TournamentThumb name={t.name} game={t.game} heroUrl={t.hero_image_url} fill />
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge tone={statusTone[status]}>{status}</Badge>
            <Badge tone="gray">{t.game}</Badge>
            {t.auto_approve ? <Badge tone="blue">Instant approval</Badge> : null}
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            {t.name}
          </h1>
          {t.description ? (
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">{t.description}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 text-sm text-zinc-400 sm:items-end">
          <span>🗓 {fmtDateTime(t.event_starts_at)}</span>
          <span>
            👥 {t.team_size}v{t.team_size}
            {t.substitutes_max > 0 ? ` (+${t.substitutes_max} sub)` : ""} per team
          </span>
          {status !== "completed" ? (
            <span>
              🏟 {slotCounts.approved}/{t.max_teams} slots filled
            </span>
          ) : null}
          <span>{Number(t.entry_fee_inr) > 0 ? `₹${Number(t.entry_fee_inr)} entry fee` : "Free entry"}</span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Main column */}
        <div className="space-y-8">
          {/* Live / VOD */}
          {status === "ongoing" && t.youtube_live_id ? (
            <div>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-red-400">
                🔴 Watch Live
              </h2>
              <div className="aspect-video w-full overflow-hidden rounded-xl border border-zinc-800">
                <iframe
                  className="h-full w-full"
                  src={youtubeEmbed(t.youtube_live_id)}
                  title="Live stream"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          ) : null}
          {status === "completed" && t.vod_url ? (
            <Card>
              <p className="text-sm text-zinc-400">
                Watch the full tournament VOD:{" "}
                <a
                  href={t.vod_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-red-400 hover:text-red-300"
                >
                  YouTube replay →
                </a>
              </p>
            </Card>
          ) : null}

          {/* Results */}
          {results.length > 0 ? (
            <div id="results" className="scroll-mt-16">
              <SectionTitle>Results</SectionTitle>
              <div className="space-y-2">
                {results.map((r) => (
                  <div
                    key={r.id}
                    className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50"
                  >
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={
                            r.placement === 1
                              ? "text-xl font-black text-yellow-400"
                              : r.placement === 2
                                ? "text-lg font-black text-zinc-300"
                                : r.placement === 3
                                  ? "text-lg font-black text-amber-600"
                                  : "text-sm font-bold text-zinc-500"
                          }
                        >
                          #{r.placement}
                        </span>
                        <span className="font-semibold text-white">
                          {r.team_tag ? `[${r.team_tag}] ` : ""}
                          {r.team_name}
                        </span>
                      </div>
                      {r.prize ? <span className="text-sm text-zinc-400">{r.prize}</span> : null}
                    </div>
                    {r.image_url ? (
                      <div className="px-4 pb-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={r.image_url}
                          alt={`${r.team_name} — placement ${r.placement}`}
                          className="max-h-80 w-full rounded-lg border border-zinc-800 object-cover"
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              {awards.length > 0 ? (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-red-400">
                    Individual awards
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {awards.map((a) => (
                      <div key={a.id} className="z4k-card flex items-center gap-3 p-3">
                        {a.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={a.image_url}
                            alt={a.player_name}
                            className="h-12 w-12 rounded-full border border-zinc-700 object-cover"
                          />
                        ) : (
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600/20 text-sm font-black text-red-400">
                            {a.player_name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">{a.player_name}</p>
                          <p className="truncate text-xs font-semibold text-red-400">{a.title}</p>
                          {a.team_name ? (
                            <p className="truncate text-xs text-zinc-500">{a.team_name}</p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {photos.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {photos.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p.id}
                      src={p.image_url}
                      alt={p.caption ?? "Tournament photo"}
                      className="aspect-video w-full rounded-lg border border-zinc-800 object-cover"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Rules */}
          {t.rules_md ? (
            <div id="rules-anchor">
              <SectionTitle>Rules</SectionTitle>
              <div
                className="prose-invert max-w-none space-y-2 text-sm leading-relaxed text-zinc-300 [&_h2]:mb-1 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-white [&_li]:ml-4 [&_li]:list-disc [&_p]:text-sm"
                dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(t.rules_md) }}
              />
            </div>
          ) : null}
        </div>

        {/* Side column */}
        <div className="space-y-6">
          {/* Registration box */}
          <Card className="scroll-mt-16 space-y-4" id="registration">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">
              Registration
            </h2>

            {myReg ? (
              <div className="space-y-3">
                <p className="text-sm text-zinc-300">
                  Your team <strong className="text-white">{myReg.team_name}</strong> is{" "}
                  <Badge tone={myReg.status === "approved" ? "green" : myReg.status === "pending" ? "yellow" : "red"}>
                    {myReg.status}
                  </Badge>
                </p>
                {myReg.status === "approved" ? (
                  <Link href={`/tournaments/${t.slug}/room`}>
                    <Button className="w-full">Open Captain&apos;s Room</Button>
                  </Link>
                ) : null}
                {myReg.status === "pending" ? (
                  <p className="text-xs text-zinc-500">
                    A manager will review your registration shortly.
                  </p>
                ) : null}
                {t.whatsapp_group_link ? (
                  <a href={t.whatsapp_group_link} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" className="w-full">Join WhatsApp group</Button>
                  </a>
                ) : null}
              </div>
            ) : status === "completed" ? (
              <p className="text-sm text-zinc-500">This tournament has ended.</p>
            ) : !regOpen ? (
              <p className="text-sm text-zinc-300">
                {reg.kind === "opens"
                  ? `Registrations open ${fmtDateTime(reg.date)}.`
                  : "Registrations are closed."}
              </p>
            ) : (
              <RegistrationForm
                tournamentId={t.id}
                teamSize={t.team_size}
                substitutesMax={t.substitutes_max}
                rulesMd={t.rules_md}
                captainName={profile?.full_name ?? null}
                autoApprove={t.auto_approve}
              />
            )}

            {t.entry_fee_inr && Number(t.entry_fee_inr) > 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-400">
                <p className="font-semibold text-zinc-200">Entry fee: ₹{Number(t.entry_fee_inr)}</p>
                {t.upi_note ? <p className="mt-1">{t.upi_note}</p> : null}
              </div>
            ) : null}
          </Card>

          {/* Captain's room preview (revealed creds) */}
          {isCaptain && nowRevealed.length > 0 ? (
            <Card className="border-red-900/60">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-red-400">
                🔑 Room credentials
              </h2>
              <div className="space-y-2">
                {nowRevealed.map((c) => (
                  <div key={c.id} className="rounded-lg bg-zinc-900 p-3 text-sm">
                    <p className="font-semibold text-white">{c.label}</p>
                    <p className="text-zinc-300">
                      ID: <span className="font-mono text-red-300">{c.room_id}</span>
                    </p>
                    <p className="text-zinc-300">
                      Pass: <span className="font-mono text-red-300">{c.room_password}</span>
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Don&apos;t share outside your team. Sharing leads to disqualification.
              </p>
            </Card>
          ) : null}

          {/* Manager contact */}
          {t.manager_contact ? (
            <Card>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-white">
                Need help?
              </h2>
              <a
                href={waMeLink(t.manager_contact, waMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-green-400 hover:text-green-300"
              >
                💬 WhatsApp the tournament manager
              </a>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Public slot list — hidden for ended tournaments */}
      {status !== "completed" ? (
        <div className="mt-10">
          <SlotsPanel
            maxTeams={t.max_teams}
            approved={slotCounts.approved}
            pending={slotCounts.pending}
            teams={publicSlots.map((s) => ({
              name: s.team_name,
              tag: s.team_tag,
            }))}
          />
        </div>
      ) : null}
    </div>
  );
}
