"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Checkbox, Field, Input, Spinner, Textarea } from "@/components/ui";
import { slugify } from "@/lib/tournament-utils";
import type { TournamentTemplate } from "@/lib/types";

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewTournamentForm({ templates }: { templates: TournamentTemplate[] }) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState<string>("blank");
  const template = templates.find((t) => t.id === templateId);

  const [name, setName] = useState("");
  const [game, setGame] = useState(template?.game ?? "");
  const [teamSize, setTeamSize] = useState(template?.team_size ?? 4);
  const [subs, setSubs] = useState(template?.substitutes_max ?? 1);
  const [maxTeams, setMaxTeams] = useState(template?.max_teams ?? 25);
  const [fee, setFee] = useState(String(template?.entry_fee_inr ?? 0));
  const [autoApprove, setAutoApprove] = useState(template?.auto_approve ?? false);
  const [rules, setRules] = useState(template?.rules_md ?? "");
  const [regStart, setRegStart] = useState(toLocalInput(new Date()));
  const [regEnd, setRegEnd] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) {
      setGame(t.game);
      setTeamSize(t.team_size);
      setSubs(t.substitutes_max);
      setMaxTeams(t.max_teams);
      setFee(String(t.entry_fee_inr));
      setAutoApprove(t.auto_approve);
      setRules(t.rules_md);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Tournament name is required.");
    if (!game.trim()) return setError("Game is required.");
    setBusy(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    let slug = slugify(name);
    const { data: existing } = await supabase
      .from("tournaments")
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();
    if (existing) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const { data, error: insertError } = await supabase
      .from("tournaments")
      .insert({
        slug,
        name: name.trim(),
        game: game.trim(),
        team_size: teamSize,
        substitutes_max: subs,
        max_teams: maxTeams,
        entry_fee_inr: Number(fee) || 0,
        auto_approve: autoApprove,
        rules_md: rules,
        registration_starts_at: regStart ? new Date(regStart).toISOString() : null,
        registration_ends_at: regEnd ? new Date(regEnd).toISOString() : null,
        event_starts_at: eventStart ? new Date(eventStart).toISOString() : null,
        event_ends_at: eventEnd ? new Date(eventEnd).toISOString() : null,
        template_id: templateId === "blank" ? null : templateId,
        created_by: userData.user?.id ?? null,
      })
      .select("id")
      .single();

    setBusy(false);
    if (insertError || !data) {
      setError(insertError?.message ?? "Could not create tournament.");
      return;
    }
    router.push(`/admin/tournaments/${data.id}`);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card className="space-y-4">
        <Field label="Start from template">
          <select className="z4k-input" value={templateId} onChange={(e) => pickTemplate(e.target.value)}>
            <option value="blank">Blank tournament</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tournament name *">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Z4K BGMI Clash — Season 2" />
          </Field>
          <Field label="Game *">
            <Input value={game} onChange={(e) => setGame(e.target.value)} placeholder="Battlegrounds Mobile India (BGMI)" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Players / team">
            <Input type="number" min={1} max={10} value={teamSize} onChange={(e) => setTeamSize(Number(e.target.value))} />
          </Field>
          <Field label="Subs / team">
            <Input type="number" min={0} max={4} value={subs} onChange={(e) => setSubs(Number(e.target.value))} />
          </Field>
          <Field label="Max teams">
            <Input type="number" min={2} max={512} value={maxTeams} onChange={(e) => setMaxTeams(Number(e.target.value))} />
          </Field>
          <Field label="Entry fee (₹)">
            <Input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Registration opens">
            <Input type="datetime-local" value={regStart} onChange={(e) => setRegStart(e.target.value)} />
          </Field>
          <Field label="Registration closes">
            <Input type="datetime-local" value={regEnd} onChange={(e) => setRegEnd(e.target.value)} />
          </Field>
          <Field label="Event starts">
            <Input type="datetime-local" value={eventStart} onChange={(e) => setEventStart(e.target.value)} />
          </Field>
          <Field label="Event ends">
            <Input type="datetime-local" value={eventEnd} onChange={(e) => setEventEnd(e.target.value)} />
          </Field>
        </div>

        <Field label="Rules (markdown)">
          <Textarea rows={8} value={rules} onChange={(e) => setRules(e.target.value)} />
        </Field>

        <Checkbox
          checked={autoApprove}
          onChange={(e) => setAutoApprove(e.target.checked)}
          label="Auto-approve registrations (first-come-first-served — teams are confirmed instantly)"
        />
      </Card>

      {error ? <div className="z4k-error">{error}</div> : null}

      <Button type="submit" disabled={busy}>
        {busy ? <Spinner /> : null}
        {busy ? "Creating…" : "Create tournament"}
      </Button>
    </form>
  );
}
