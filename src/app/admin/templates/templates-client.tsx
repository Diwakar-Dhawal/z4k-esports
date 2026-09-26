"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Checkbox, Field, Input, Spinner, Textarea } from "@/components/ui";
import { useConfirm } from "@/components/modal";
import type { TournamentTemplate } from "@/lib/types";

export function TemplatesClient({ templates }: { templates: TournamentTemplate[] }) {
  const router = useRouter();
  const supabase = createClient();
  const { ask, dialog } = useConfirm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TournamentTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    game: "",
    team_size: 4,
    substitutes_max: 1,
    max_teams: 25,
    entry_fee_inr: 0,
    auto_approve: false,
    rules_md: "",
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!draft.name.trim()) return setError("Template name is required.");
    if (!draft.game.trim()) return setError("Game is required.");
    setBusy(true);
    const row = {
      name: draft.name.trim(),
      game: draft.game.trim(),
      team_size: draft.team_size,
      substitutes_max: draft.substitutes_max,
      max_teams: draft.max_teams,
      entry_fee_inr: draft.entry_fee_inr,
      auto_approve: draft.auto_approve,
      rules_md: draft.rules_md,
    };
    const { error } = editing
      ? await supabase.from("tournament_templates").update(row).eq("id", editing.id)
      : await supabase.from("tournament_templates").insert(row);
    setBusy(false);
    if (error) setError(error.message);
    else {
      setEditing(null);
      setCreating(false);
      router.refresh();
    }
  }

  async function remove(t: TournamentTemplate) {
    ask(
      "Delete template?",
      `"${t.name}" will be removed. Tournaments already created from it are not affected.`,
      async () => {
        const { error } = await supabase.from("tournament_templates").delete().eq("id", t.id);
        if (error) setError(error.message);
        else router.refresh();
      },
    );
  }

  function startEdit(t: TournamentTemplate) {
    setEditing(t);
    setCreating(false);
    setDraft({
      name: t.name,
      game: t.game,
      team_size: t.team_size,
      substitutes_max: t.substitutes_max,
      max_teams: t.max_teams,
      entry_fee_inr: Number(t.entry_fee_inr),
      auto_approve: t.auto_approve,
      rules_md: t.rules_md,
    });
  }

  function startCreate() {
    setCreating(true);
    setEditing(null);
    setDraft({
      name: "",
      game: "",
      team_size: 4,
      substitutes_max: 1,
      max_teams: 25,
      entry_fee_inr: 0,
      auto_approve: false,
      rules_md: "",
    });
  }

  const form = (
    <Card className="space-y-4 border-red-900/50">
      <h2 className="text-sm font-bold uppercase tracking-widest text-white">
        {editing ? "Edit template" : "New template"}
      </h2>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Template name *">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="BGMI Squad (4+1, 25 slots)" />
          </Field>
          <Field label="Game *">
            <Input value={draft.game} onChange={(e) => setDraft({ ...draft, game: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Players / team">
            <Input type="number" min={1} max={10} value={draft.team_size} onChange={(e) => setDraft({ ...draft, team_size: Number(e.target.value) })} />
          </Field>
          <Field label="Subs / team">
            <Input type="number" min={0} max={4} value={draft.substitutes_max} onChange={(e) => setDraft({ ...draft, substitutes_max: Number(e.target.value) })} />
          </Field>
          <Field label="Max teams">
            <Input type="number" min={2} max={512} value={draft.max_teams} onChange={(e) => setDraft({ ...draft, max_teams: Number(e.target.value) })} />
          </Field>
          <Field label="Entry fee (₹)">
            <Input type="number" min={0} value={draft.entry_fee_inr} onChange={(e) => setDraft({ ...draft, entry_fee_inr: Number(e.target.value) })} />
          </Field>
        </div>
        <Field label="Rules (markdown)">
          <Textarea rows={6} value={draft.rules_md} onChange={(e) => setDraft({ ...draft, rules_md: e.target.value })} />
        </Field>
        <Checkbox
          checked={draft.auto_approve}
          onChange={(e) => setDraft({ ...draft, auto_approve: e.target.checked })}
          label="Auto-approve registrations by default"
        />
        {error ? <div className="z4k-error">{error}</div> : null}
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? <Spinner /> : null} Save template
          </Button>
          <Button type="button" variant="ghost" onClick={() => { setEditing(null); setCreating(false); }}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );

  return (
    <div className="space-y-6">
      {(creating || editing) && form}
      <div className="space-y-3">
        {templates.map((t) => (
          <Card key={t.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-white">{t.name}</p>
              <p className="text-sm text-zinc-400">
                {t.game} · {t.team_size}+{t.substitutes_max} · {t.max_teams} slots ·{" "}
                {Number(t.entry_fee_inr) > 0 ? `₹${Number(t.entry_fee_inr)}` : "free"} ·{" "}
                {t.auto_approve ? "auto-approve" : "manual review"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => startEdit(t)}>Edit</Button>
              <Button size="sm" variant="danger" onClick={() => remove(t)}>Delete</Button>
            </div>
          </Card>
        ))}
        {templates.length === 0 ? (
          <p className="text-sm text-zinc-500">No templates yet.</p>
        ) : null}
      </div>
      {!creating && !editing ? (
        <Button onClick={startCreate}>+ New template</Button>
      ) : null}
      {dialog}
    </div>
  );
}
