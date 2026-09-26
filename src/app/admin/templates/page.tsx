import { createClient } from "@/lib/supabase/server";
import { SectionTitle } from "@/components/ui";
import { TemplatesClient } from "./templates-client";
import type { TournamentTemplate } from "@/lib/types";

export default async function AdminTemplatesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournament_templates")
    .select("*")
    .order("name");
  return (
    <div>
      <SectionTitle sub="Reusable tournament configs — spin up the next BGMI clash in seconds.">
        Templates
      </SectionTitle>
      <TemplatesClient templates={(data ?? []) as TournamentTemplate[]} />
    </div>
  );
}
