import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SectionTitle } from "@/components/ui";
import { TournamentEditor } from "./tournament-editor";
import type {
  Tournament,
  RoomCredential,
  TournamentResult,
  TournamentPhoto,
  TournamentAward,
  TournamentTemplate,
} from "@/lib/types";

export default async function AdminTournamentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [tRes, credsRes, resultsRes, photosRes, awardsRes, templatesRes] = await Promise.all([
    supabase.from("tournaments").select("*").eq("id", id).single(),
    supabase.from("room_credentials").select("*").eq("tournament_id", id).order("sort_order"),
    supabase.from("tournament_results").select("*").eq("tournament_id", id).order("placement"),
    supabase.from("tournament_photos").select("*").eq("tournament_id", id).order("sort_order"),
    supabase.from("tournament_awards").select("*").eq("tournament_id", id).order("sort_order"),
    supabase.from("tournament_templates").select("*").order("name"),
  ]);

  if (!tRes.data) notFound();
  const t = tRes.data as Tournament;

  return (
    <div className="max-w-4xl">
      <SectionTitle sub={`/tournaments/${t.slug}`}>{t.name}</SectionTitle>
      <TournamentEditor
        tournament={t}
        credentials={(credsRes.data ?? []) as RoomCredential[]}
        results={(resultsRes.data ?? []) as TournamentResult[]}
        photos={(photosRes.data ?? []) as TournamentPhoto[]}
        awards={(awardsRes.data ?? []) as TournamentAward[]}
        templates={(templatesRes.data ?? []) as TournamentTemplate[]}
      />
    </div>
  );
}
