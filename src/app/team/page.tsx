import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { TeamSection } from "@/components/team-section";

export const metadata: Metadata = { title: "The Roster" };

export default async function TeamPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("content_blocks")
    .select("body")
    .eq("key", "about_org")
    .eq("is_active", true)
    .maybeSingle();

  return (
    <div className="py-4">
      <TeamSection aboutCopy={data?.body} />
    </div>
  );
}
