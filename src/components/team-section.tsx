import { createClient } from "@/lib/supabase/server";
import { MemberEmblem } from "@/components/esports-art";
import { EmptyState, SectionTitle } from "@/components/ui";
import type { MemberCategory, TeamMember } from "@/lib/types";

export async function TeamSection({ aboutCopy }: { aboutCopy?: string }) {
  const supabase = await createClient();
  const [categoriesRes, membersRes] = await Promise.all([
    supabase.from("member_categories").select("*").order("sort_order"),
    supabase.from("team_members").select("*").eq("is_active", true).order("sort_order"),
  ]);

  const categories = (categoriesRes.data ?? []) as MemberCategory[];
  const members = (membersRes.data ?? []) as TeamMember[];

  return (
    <section id="team" className="py-14">
      <div className="z4k-container">
        <SectionTitle sub={aboutCopy ?? "The people behind the tag."}>
          The Roster
        </SectionTitle>
        <div className="space-y-8">
          {categories.map((cat) => {
            const catMembers = members.filter((m) => m.category_id === cat.id);
            if (catMembers.length === 0) return null;
            return (
              <div key={cat.id}>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-red-400">
                  {cat.name}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {catMembers.map((m) => (
                    <div key={m.id} className="z4k-card p-4">
                      <div className="flex items-center gap-3">
                        <MemberEmblem
                          name={m.name}
                          tag={m.tag}
                          photoUrl={m.photo_url}
                          size={48}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">{m.name}</p>
                          {m.role_title ? (
                            <p className="truncate text-xs text-zinc-400">{m.role_title}</p>
                          ) : null}
                        </div>
                      </div>
                      {m.bio ? (
                        <p className="mt-2 line-clamp-2 text-xs text-zinc-500">{m.bio}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {categories.length === 0 ? <EmptyState>Roster coming soon.</EmptyState> : null}
        </div>
      </div>
    </section>
  );
}
