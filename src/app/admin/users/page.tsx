import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/profile";
import { SectionTitle } from "@/components/ui";
import { UsersClient } from "./users-client";
import type { Profile } from "@/lib/types";

export default async function AdminUsersPage() {
  const profile = await getProfile();
  if (profile?.role !== "admin") redirect("/admin");

  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });
  return (
    <div>
      <SectionTitle sub="Admin only — assign Admin / Manager roles. Managers cannot see or change this page.">
        Users & roles
      </SectionTitle>
      <UsersClient users={(data ?? []) as Profile[]} />
    </div>
  );
}
