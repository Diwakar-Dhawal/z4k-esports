import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, SectionTitle } from "@/components/ui";
import { fmtDateTime, tournamentStatus } from "@/lib/tournament-utils";
import type { Tournament, AuditEntry } from "@/lib/types";

interface SlotCount {
  tournament_id: string;
  approved: number;
  pending: number;
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const [tournamentsRes, slotsRes, pendingRes, auditRes] = await Promise.all([
    supabase.from("tournaments").select("*").is("archived_at", null),
    supabase.rpc("slot_counts"),
    supabase.from("registrations").select("id", { count: "exact" }).eq("status", "pending"),
    supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(10),
  ]);

  const tournaments = (tournamentsRes.data ?? []) as Tournament[];
  const slots = ((slotsRes.data ?? []) as SlotCount[]) ?? [];
  const pendingCount = pendingRes.count ?? 0;
  const audit = (auditRes.data ?? []) as AuditEntry[];

  const upcoming = tournaments.filter((t) => tournamentStatus(t) === "upcoming").length;
  const ongoing = tournaments.filter((t) => tournamentStatus(t) === "ongoing").length;
  const completed = tournaments.filter((t) => tournamentStatus(t) === "completed").length;
  const totalApproved = slots.reduce((acc, s) => acc + Number(s.approved), 0);

  const stats = [
    { label: "Upcoming", value: upcoming },
    { label: "Ongoing", value: ongoing },
    { label: "Completed", value: completed },
    { label: "Approved teams", value: totalApproved },
  ];

  return (
    <div className="space-y-10">
      <section>
        <SectionTitle sub="The state of the org at a glance.">Overview</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="text-center">
              <p className="text-3xl font-black text-white">{s.value}</p>
              <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">{s.label}</p>
            </Card>
          ))}
        </div>
        {pendingCount > 0 ? (
          <div className="mt-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
            <strong>{pendingCount}</strong> registration{pendingCount === 1 ? "" : "s"} waiting for
            review.{" "}
            <Link href="/admin/registrations" className="font-bold underline">
              Review now →
            </Link>
          </div>
        ) : null}
      </section>

      <section>
        <SectionTitle sub="Who changed what, most recent first.">Recent activity</SectionTitle>
        {audit.length === 0 ? (
          <EmptyState>No activity recorded yet.</EmptyState>
        ) : (
          <div className="space-y-1">
            {audit.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-800/60 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-400"
              >
                <span className="font-mono uppercase text-zinc-500">{a.action}</span>
                <span className="font-semibold text-zinc-200">{a.entity}</span>
                <span>{a.summary ?? a.entity_id?.slice(0, 8)}</span>
                <span className="ml-auto">{fmtDateTime(a.at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
