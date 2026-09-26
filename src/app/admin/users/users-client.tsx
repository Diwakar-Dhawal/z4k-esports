"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Card, Select } from "@/components/ui";
import { useConfirm } from "@/components/modal";
import { fmtDate, ROLE_LABELS } from "@/lib/tournament-utils";
import type { Profile } from "@/lib/types";

const TONE = { admin: "red", manager: "blue", user: "gray" } as const;

export function UsersClient({ users }: { users: Profile[] }) {
  const router = useRouter();
  const supabase = createClient();
  const { ask, dialog } = useConfirm();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(query.toLowerCase()) ||
      (u.full_name ?? "").toLowerCase().includes(query.toLowerCase()),
  );

  async function setRole(u: Profile, role: string) {
    const label = role === "admin" ? "Admin" : role === "manager" ? "Manager" : "User";
    ask(
      `Change role to ${label}?`,
      `${u.full_name ?? u.email} will ${role === "user" ? "lose staff access" : `gain ${label} powers`}. This takes effect on their next page load.`,
      async () => {
        setBusyId(u.id);
        setError(null);
        const { error } = await supabase.from("users").update({ role }).eq("id", u.id);
        setBusyId(null);
        if (error) setError(error.message);
        else router.refresh();
      },
      "Change role",
    );
  }

  return (
    <div className="space-y-4">
      <input
        className="z4k-input max-w-sm"
        placeholder="Search by name or email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {error ? <div className="z4k-error">{error}</div> : null}
      <div className="space-y-2">
        {filtered.map((u) => (
          <Card key={u.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  {u.full_name ?? "Unnamed player"}
                </span>
                <Badge tone={TONE[u.role]}>{ROLE_LABELS[u.role]}</Badge>
              </div>
              <p className="text-sm text-zinc-400">{u.email}</p>
              <p className="text-xs text-zinc-500">
                {u.whatsapp ? `WhatsApp ${u.whatsapp}` : "No WhatsApp on file"} · joined{" "}
                {fmtDate(u.created_at ?? null)}
              </p>
            </div>
            <Select
              value={u.role}
              onChange={(e) => setRole(u, e.target.value)}
              disabled={busyId === u.id}
              className="w-36"
            >
              <option value="user">User</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </Select>
          </Card>
        ))}
        {filtered.length === 0 ? (
          <p className="text-sm text-zinc-500">No users match.</p>
        ) : null}
      </div>
      {dialog}
    </div>
  );
}
