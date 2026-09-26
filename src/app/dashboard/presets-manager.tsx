"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, EmptyState, Field, Input, Spinner } from "@/components/ui";
import type { TeamPreset } from "@/lib/types";

interface Row {
  ign: string;
  uid: string;
  player_role: string;
}

const emptyRow = (): Row => ({ ign: "", uid: "", player_role: "" });

export function PresetsManager({ initialPresets }: { initialPresets: TeamPreset[] }) {
  const router = useRouter();
  const [presets] = useState(initialPresets);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRows, setNewRows] = useState<Row[]>([emptyRow(), emptyRow(), emptyRow(), emptyRow()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createPreset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const rows = newRows.filter((r) => r.ign.trim() && r.uid.trim());
    if (!newName.trim()) return setError("Preset name is required.");
    if (rows.length === 0) return setError("Add at least one player (IGN + UID).");
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("team_presets")
      .insert({ name: newName.trim() })
      .select("id")
      .single();
    if (error || !data) {
      setError(error?.message ?? "Could not create preset.");
      setBusy(false);
      return;
    }
    await supabase.from("preset_players").insert(
      rows.map((r, i) => ({
        preset_id: data.id,
        ign: r.ign.trim(),
        uid: r.uid.trim(),
        player_role: r.player_role.trim() || null,
        sort_order: i,
      })),
    );
    setBusy(false);
    setCreating(false);
    setNewName("");
    setNewRows([emptyRow(), emptyRow(), emptyRow(), emptyRow()]);
    router.refresh();
  }

  async function deletePreset(id: string) {
    const supabase = createClient();
    await supabase.from("team_presets").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {presets.length === 0 && !creating ? (
        <EmptyState>No presets yet. Save a team for one-click registration.</EmptyState>
      ) : null}

      <div className="space-y-3">
        {presets.map((p) => (
          <div key={p.id} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">{p.name}</span>
              <button
                onClick={() => deletePreset(p.id)}
                className="text-xs font-semibold text-red-400 hover:text-red-300"
              >
                Delete
              </button>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {(p.preset_players ?? [])
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((pl) => `${pl.ign} (${pl.uid})`)
                .join(" · ") || "No players"}
            </p>
          </div>
        ))}
      </div>

      {creating ? (
        <form onSubmit={createPreset} className="space-y-3 rounded-lg border border-zinc-700 p-3">
          <Field label="Preset name">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Main Squad"
            />
          </Field>
          {newRows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_100px_1fr] gap-2">
              <input
                className="z4k-input"
                placeholder="IGN"
                value={r.ign}
                onChange={(e) =>
                  setNewRows((rows) => rows.map((x, idx) => (idx === i ? { ...x, ign: e.target.value } : x)))
                }
              />
              <input
                className="z4k-input"
                placeholder="UID"
                inputMode="numeric"
                value={r.uid}
                onChange={(e) =>
                  setNewRows((rows) =>
                    rows.map((x, idx) =>
                      idx === i ? { ...x, uid: e.target.value.replace(/[^0-9]/g, "") } : x,
                    ),
                  )
                }
              />
              <input
                className="z4k-input"
                placeholder="Role (optional)"
                value={r.player_role}
                onChange={(e) =>
                  setNewRows((rows) => rows.map((x, idx) => (idx === i ? { ...x, player_role: e.target.value } : x)))
                }
              />
            </div>
          ))}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setNewRows((rows) => [...rows, emptyRow()])}
              className="text-xs font-semibold text-red-400 hover:text-red-300"
            >
              + Add player
            </button>
            <button
              type="button"
              onClick={() => setNewRows((rows) => (rows.length > 1 ? rows.slice(0, -1) : rows))}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Remove last
            </button>
          </div>
          {error ? <div className="z4k-error">{error}</div> : null}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? <Spinner /> : null} Save preset
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
          + New preset
        </Button>
      )}
    </div>
  );
}
