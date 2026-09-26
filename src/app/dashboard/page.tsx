import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/profile";
import { PresetsManager } from "./presets-manager";
import { TournamentThumb } from "@/components/esports-art";
import { Badge, Button, Card, EmptyState, SectionTitle } from "@/components/ui";
import { fmtDateTime } from "@/lib/tournament-utils";
import type { Registration, TeamPreset } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/dashboard");

  const supabase = await createClient();
  const [regsRes, presetsRes] = await Promise.all([
    supabase
      .from("registrations")
      .select(
        "*, tournaments(slug, name, event_starts_at, hero_image_url), registration_players(ign, uid, player_role, sort_order)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("team_presets")
      .select("*, preset_players(*)")
      .order("created_at", { ascending: false }),
  ]);

  const registrations = (regsRes.data ?? []) as Registration[];
  const presets = (presetsRes.data ?? []) as TeamPreset[];

  return (
    <div className="z4k-container space-y-12 py-10">
      <div>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wide text-white">
              Dashboard
            </h1>
            <p className="text-sm text-zinc-400">
              Presets, registrations and tournament status in one place.
            </p>
          </div>
          <Link href="/profile">
            <Button variant="secondary" size="sm">Edit profile →</Button>
          </Link>
        </div>

        <Card>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-white">
            Team presets
          </h2>
          <p className="mb-4 text-xs text-zinc-500">
            Save your squad once — load it in one click at every registration.
          </p>
          <PresetsManager initialPresets={presets} />
        </Card>
      </div>

      <div>
        <SectionTitle sub="Your tournament registrations and their review status.">
          My registrations
        </SectionTitle>
        {registrations.length === 0 ? (
          <EmptyState>
            No registrations yet.{" "}
            <Link href="/tournaments" className="text-red-400 hover:text-red-300">
              Browse tournaments →
            </Link>
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {registrations.map((r) => {
              const t = Array.isArray(r.tournaments) ? r.tournaments[0] : r.tournaments;
              return (
                <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="w-24 shrink-0 self-start overflow-hidden rounded-lg border border-zinc-800">
                    <TournamentThumb
                      name={t?.name ?? r.team_name}
                      heroUrl={t?.hero_image_url ?? null}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{r.team_name}</span>
                      <Badge
                        tone={
                          r.status === "approved"
                            ? "green"
                            : r.status === "pending"
                              ? "yellow"
                              : "red"
                        }
                      >
                        {r.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-zinc-400">
                      {t?.name ?? "Tournament"} · {fmtDateTime(t?.event_starts_at)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {(r.registration_players ?? [])
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((p) => p.ign)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.status === "approved" && t?.slug ? (
                      <Link
                        href={`/tournaments/${t.slug}/room`}
                        className="text-sm font-semibold text-red-400 hover:text-red-300"
                      >
                        Captain&apos;s Room →
                      </Link>
                    ) : null}
                    {t?.slug ? (
                      <Link
                        href={`/tournaments/${t.slug}`}
                        className="text-sm text-zinc-400 hover:text-white"
                      >
                        View
                      </Link>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
