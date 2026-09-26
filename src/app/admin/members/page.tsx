import { createClient } from "@/lib/supabase/server";
import { SectionTitle } from "@/components/ui";
import { MembersClient } from "./members-client";
import type { MemberCategory, TeamMember } from "@/lib/types";

export default async function AdminMembersPage() {
  const supabase = await createClient();
  const [catRes, memRes] = await Promise.all([
    supabase.from("member_categories").select("*").order("sort_order"),
    supabase.from("team_members").select("*").order("sort_order"),
  ]);
  return (
    <div>
      <SectionTitle sub="Categories (Owner, Players, …) and everyone on the About Team page.">
        Team page
      </SectionTitle>
      <MembersClient
        categories={(catRes.data ?? []) as MemberCategory[]}
        members={(memRes.data ?? []) as TeamMember[]}
      />
    </div>
  );
}
