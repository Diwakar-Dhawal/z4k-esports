"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Card, EmptyState, Select } from "@/components/ui";
import { fmtDateTime } from "@/lib/tournament-utils";
import type { Registration } from "@/lib/types";

const STATUS_TONE = { approved: "green", pending: "yellow", rejected: "red" } as const;
const PAYMENT_TONE = { unpaid: "gray", pending_review: "yellow", paid: "green" } as const;

export function RegistrationsClient({
  initialRegistrations,
  tournaments,
}: {
  initialRegistrations: Registration[];
  tournaments: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [regs] = useState(initialRegistrations);
  const [filterTournament, setFilterTournament] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const tournamentName = (id: string) =>
    tournaments.find((t) => t.id === id)?.name ?? "Unknown tournament";

  const filtered = useMemo(
    () =>
      regs.filter(
        (r) =>
          (filterTournament === "all" || r.tournament_id === filterTournament) &&
          (filterStatus === "all" || r.status === filterStatus),
      ),
    [regs, filterTournament, filterStatus],
  );

  const pending = regs.filter((r) => r.status === "pending").length;

  async function setStatus(reg: Registration, status: "approved" | "rejected" | "pending") {
    setBusyId(reg.id);
    const supabase = createClient();
    await supabase
      .from("registrations")
      .update({ status, review_note: status === "rejected" ? "Rejected by staff" : null })
      .eq("id", reg.id);
    setBusyId(null);
    router.refresh();
  }

  async function setPayment(reg: Registration, payment: string) {
    setBusyId(reg.id);
    const supabase = createClient();
    await supabase
      .from("registrations")
      .update({ payment_status: payment })
      .eq("id", reg.id);
    setBusyId(null);
    router.refresh();
  }

  function exportCsv() {
    const rows = [["Tournament", "Team", "Tag", "WhatsApp", "Status", "Payment", "Captain", "Email", "Players", "Registered"]];
    for (const r of filtered) {
      const captain = Array.isArray(r.users) ? r.users[0] : r.users;
      const players = (r.registration_players ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((p) => `${p.ign} (${p.uid})${p.player_role ? ` - ${p.player_role}` : ""}`)
        .join("; ");
      rows.push([
        tournamentName(r.tournament_id),
        r.team_name,
        r.team_tag ?? "",
        r.whatsapp,
        r.status,
        r.payment_status,
        r.guest_name ?? captain?.full_name ?? "",
        captain?.email ?? "guest",
        players,
        new Date(r.created_at).toISOString(),
      ]);
    }
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `z4k-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filterTournament}
          onChange={(e) => setFilterTournament(e.target.value)}
          className="w-56"
        >
          <option value="all">All tournaments</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-40"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending ({pending})</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
        <Button size="sm" variant="secondary" onClick={exportCsv}>
          ⬇ Export CSV
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>No registrations match this filter.</EmptyState>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const captain = Array.isArray(r.users) ? r.users[0] : r.users;
            const tournament = Array.isArray(r.tournaments) ? r.tournaments[0] : r.tournaments;
            return (
              <Card key={r.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white">{r.team_name}</span>
                      {r.team_tag ? (
                        <span className="text-xs font-semibold text-red-400">[{r.team_tag}]</span>
                      ) : null}
                      <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                      {r.duplicate_ign ? (
                        <Badge tone="red">⚠ duplicate IGN</Badge>
                      ) : null}
                      <Badge tone={PAYMENT_TONE[r.payment_status]}>
                        {r.payment_status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-zinc-400">
                      {tournamentName(r.tournament_id)}
                      {tournament ? ` · ${tournament.max_teams} slots · ₹${Number(tournament.entry_fee_inr)}` : ""}
                      {" · "}
                      {fmtDateTime(r.created_at)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Captain: {r.guest_name ?? captain?.full_name ?? "—"}
                      {captain?.email ? ` (${captain.email})` : " (guest)"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={r.payment_status}
                      onChange={(e) => setPayment(r, e.target.value)}
                      className="w-40"
                      disabled={busyId === r.id}
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="pending_review">Payment pending review</option>
                      <option value="paid">Paid</option>
                    </Select>
                    {r.status !== "approved" ? (
                      <Button
                        size="sm"
                        onClick={() => setStatus(r, "approved")}
                        disabled={busyId === r.id}
                      >
                        Approve
                      </Button>
                    ) : null}
                    {r.status !== "rejected" ? (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setStatus(r, "rejected")}
                        disabled={busyId === r.id}
                      >
                        Reject
                      </Button>
                    ) : null}
                    {r.status !== "pending" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setStatus(r, "pending")}
                        disabled={busyId === r.id}
                      >
                        Re-queue
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Squad · WhatsApp {r.whatsapp}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(r.registration_players ?? [])
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((p, i) => (
                        <span
                          key={p.id ?? i}
                          className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
                        >
                          {p.ign} <span className="text-zinc-500">· {p.uid}</span>
                          {p.uid_verified ? (
                            <span className="ml-1 text-green-400" title={`Verified as “${p.verified_name}”`}>✓</span>
                          ) : (
                            <span className="ml-1 text-zinc-600" title="Not verified against BGMI servers">✗</span>
                          )}
                          {p.player_role ? <span className="text-red-400"> · {p.player_role}</span> : null}
                        </span>
                      ))}
                  </div>
                </div>

                {r.review_note ? (
                  <p className="text-xs text-zinc-500">Review note: {r.review_note}</p>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
