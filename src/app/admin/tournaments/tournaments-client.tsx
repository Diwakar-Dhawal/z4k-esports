"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { useConfirm } from "@/components/modal";
import { TournamentThumb } from "@/components/esports-art";
import { fmtDateTime } from "@/lib/tournament-utils";
import type { Tournament, TournamentTemplate } from "@/lib/types";

type Row = Tournament & {
  approved: number;
  pending: number;
  derivedStatus: "upcoming" | "ongoing" | "completed";
};

const STATUS_TONE = { upcoming: "blue", ongoing: "green", completed: "gray" } as const;

export function TournamentsClient({
  tournaments,
  templates,
}: {
  tournaments: Row[];
  templates: TournamentTemplate[];
}) {
  const router = useRouter();
  const { ask, dialog } = useConfirm();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const visible = tournaments.filter((t) => (showArchived ? true : !t.archived_at));

  async function archive(id: string, archived: boolean) {
    setBusyId(id);
    const supabase = createClient();
    await supabase
      .from("tournaments")
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq("id", id);
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-red-600"
          />
          Show archived
        </label>
        <Link href="/admin/tournaments/new">
          <Button>+ New tournament</Button>
        </Link>
      </div>

      {templates.length > 0 ? (
        <p className="text-xs text-zinc-500">
          Templates available: {templates.map((t) => t.name).join(" · ")}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState>No tournaments yet — create your first one.</EmptyState>
      ) : (
        <div className="space-y-3">
          {visible.map((t) => (
            <Card key={t.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="w-28 shrink-0 overflow-hidden rounded-lg border border-zinc-800">
                  <TournamentThumb name={t.name} game={t.game} heroUrl={t.hero_image_url} />
                </div>
                <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-white">{t.name}</span>
                  <Badge tone={STATUS_TONE[t.derivedStatus]}>{t.derivedStatus}</Badge>
                  {t.archived_at ? <Badge tone="red">archived</Badge> : null}
                  {t.status_override ? <Badge tone="blue">override: {t.status_override}</Badge> : null}
                </div>                <p className="mt-1 text-sm text-zinc-400">
                  {t.game} · {t.team_size}+{t.substitutes_max} · {t.approved}/{t.max_teams} slots · {" "}
                  {fmtDateTime(t.event_starts_at)}
                </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/tournaments/${t.id}`}>
                  <Button size="sm" variant="secondary">Edit</Button>
                </Link>
                {t.archived_at ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === t.id}
                    onClick={() => archive(t.id, false)}
                  >
                    Restore
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busyId === t.id}
                    onClick={() =>
                      ask(
                        "Archive tournament?",
                        `"${t.name}" disappears from the public site. Registrations are kept and you can restore it anytime.`,
                        () => archive(t.id, true),
                        "Archive",
                      )
                    }
                  >
                    Archive
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      {dialog}
    </div>
  );
}
