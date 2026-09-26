import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, isStaff } from "@/lib/supabase/profile";
import { Badge, Card, EmptyState, SectionTitle } from "@/components/ui";
import { fmtDateTime } from "@/lib/tournament-utils";
import type { RoomCredential, Tournament } from "@/lib/types";

export const metadata: Metadata = { title: "Captain's Room" };

export default async function RoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: tData } = await supabase
    .from("tournaments")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();
  if (!tData) notFound();
  const t = tData as Pick<Tournament, "id" | "name" | "slug">;

  // RLS only returns credentials to approved captains (or staff)
  const { data: creds } = await supabase
    .from("room_credentials")
    .select("*")
    .eq("tournament_id", t.id)
    .order("sort_order");
  const credentials = (creds ?? []) as RoomCredential[];

  // Distinguish "approved" vs "pending" for messaging
  const { data: myReg } = profile
    ? await supabase
        .from("registrations")
        .select("status")
        .eq("tournament_id", t.id)
        .eq("user_id", profile.id)
        .maybeSingle()
    : { data: null };

  const approved = myReg?.status === "approved";
  const now = new Date();

  return (
    <div className="z4k-container max-w-3xl py-10">
      <SectionTitle sub={`Match credentials for ${t.name}.`}>Captain&apos;s Room</SectionTitle>

      {!profile ? (
        <EmptyState>
          <Link href={`/login?next=/tournaments/${slug}/room`} className="text-red-400 hover:text-red-300">
            Sign in
          </Link>{" "}
          with the Google account you registered with.
        </EmptyState>
      ) : !approved && !isStaff(profile) ? (
        <EmptyState>
          {myReg
            ? "Your registration isn't approved yet — credentials appear here once a manager approves your team."
            : "You don't have a registration for this tournament. Register first, then return here once approved."}
        </EmptyState>
      ) : credentials.length === 0 ? (
        <EmptyState>
          Room credentials haven&apos;t been published yet. Check back closer to match time.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {credentials.map((c) => {
            const revealed = new Date(c.reveal_at) <= now;
            return (
              <Card key={c.id} className={revealed ? "border-red-900/60" : undefined}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{c.label}</span>
                  <Badge tone={revealed ? "green" : "gray"}>
                    {revealed ? "revealed" : "scheduled"}
                  </Badge>
                </div>
                {revealed ? (
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-zinc-300">
                      Room ID:{" "}
                      <span className="select-all font-mono text-base text-red-300">{c.room_id}</span>
                    </p>
                    <p className="text-zinc-300">
                      Password:{" "}
                      <span className="select-all font-mono text-base text-red-300">
                        {c.room_password}
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500">
                    Unlocks {fmtDateTime(c.reveal_at)} — keep this page open.
                  </p>
                )}
              </Card>
            );
          })}
          <p className="text-xs text-zinc-500">
            Credentials are for approved captains only. Sharing them outside your team leads to
            disqualification of the whole squad.
          </p>
        </div>
      )}
    </div>
  );
}
