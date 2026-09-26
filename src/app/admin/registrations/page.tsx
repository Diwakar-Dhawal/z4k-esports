import { createClient } from "@/lib/supabase/server";
import { SectionTitle } from "@/components/ui";
import { RegistrationsClient } from "./registrations-client";
import type { Registration } from "@/lib/types";

export default async function AdminRegistrationsPage() {
  const supabase = await createClient();
  const [regsRes, tournamentsRes] = await Promise.all([
    supabase
      .from("registrations")
      .select(
        "*, users(email, full_name), tournaments(slug, name, max_teams, entry_fee_inr), registration_players(ign, uid, player_role, sort_order)",
      )
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("tournaments").select("id, name").is("archived_at", null).order("name"),
  ]);

  return (
    <div>
      <SectionTitle sub="Approve or reject team registrations, track payments, export slot sheets.">
        Registrations
      </SectionTitle>
      <RegistrationsClient
        initialRegistrations={(regsRes.data ?? []) as Registration[]}
        tournaments={(tournamentsRes.data ?? []) as Array<{ id: string; name: string }>}
      />
    </div>
  );
}
