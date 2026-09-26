import { createClient } from "@/lib/supabase/server";
import { SectionTitle } from "@/components/ui";
import { NewTournamentForm } from "./new-form";
import type { TournamentTemplate } from "@/lib/types";

export default async function NewTournamentPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournament_templates")
    .select("*")
    .order("name");
  return (
    <div className="max-w-3xl">
      <SectionTitle sub="Start from a template or blank — you can edit everything afterwards.">
        New tournament
      </SectionTitle>
      <NewTournamentForm templates={(data ?? []) as TournamentTemplate[]} />
    </div>
  );
}
