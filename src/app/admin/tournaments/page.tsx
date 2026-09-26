import { createClient } from "@/lib/supabase/server";
import { SectionTitle } from "@/components/ui";
import { TournamentsClient } from "./tournaments-client";
import { tournamentStatus } from "@/lib/tournament-utils";
import type { Tournament, TournamentTemplate } from "@/lib/types";

interface SlotCount {
  tournament_id: string;
  approved: number;
  pending: number;
}

export default async function AdminTournamentsPage() {
  const supabase = await createClient();
  const [tournamentsRes, templatesRes, slotsRes] = await Promise.all([
    supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("tournament_templates").select("*").order("name"),
    supabase.rpc("slot_counts"),
  ]);

  const tournaments = (tournamentsRes.data ?? []) as Tournament[];
  const templates = (templatesRes.data ?? []) as TournamentTemplate[];
  const slots = ((slotsRes.data ?? []) as SlotCount[]) ?? [];
  const slotMap = new Map(slots.map((s) => [s.tournament_id, s]));

  return (
    <div>
      <SectionTitle sub="Create from a template, edit every detail, archive when done. Never hard-deleted.">
        Tournaments
      </SectionTitle>
      <TournamentsClient
        tournaments={tournaments.map((t) => ({
          ...t,
          approved: slotMap.get(t.id)?.approved ?? 0,
          pending: slotMap.get(t.id)?.pending ?? 0,
          derivedStatus: tournamentStatus(t),
        }))}
        templates={templates}
      />
    </div>
  );
}
