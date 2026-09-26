import Link from "next/link";
import type { Tournament } from "@/lib/types";
import {
  fmtDateTime,
  isRegistrationOpen,
  regState,
  tournamentStatus,
} from "@/lib/tournament-utils";
import { TournamentThumb } from "@/components/esports-art";
import { Badge, Button } from "@/components/ui";

const statusTone = {
  upcoming: "blue",
  ongoing: "green",
  completed: "gray",
} as const;

export function TournamentCard({
  t,
  approved,
  pending,
}: {
  t: Tournament;
  approved: number;
  pending: number;
}) {
  const status = tournamentStatus(t);
  const regOpen = isRegistrationOpen(t);
  const reg = regState(t);

  return (
    <div className="z4k-card flex flex-col overflow-hidden">
      <TournamentThumb name={t.name} game={t.game} heroUrl={t.hero_image_url} />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">{t.name}</h3>
            <p className="text-sm text-zinc-400">{t.game}</p>
          </div>
          <Badge tone={statusTone[status]}>{status}</Badge>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-400">
          <span>🗓 {fmtDateTime(t.event_starts_at)}</span>
          <span>
            👥 {t.team_size}v{t.team_size}
            {t.substitutes_max > 0 ? ` (+${t.substitutes_max} sub)` : ""}
          </span>
          {status !== "completed" ? (
            <span>
              🏟 {approved}/{t.max_teams} slots
              {pending > 0 ? ` · ${pending} pending` : ""}
            </span>
          ) : null}
          {Number(t.entry_fee_inr) > 0 ? (
            <span>₹{Number(t.entry_fee_inr)} entry</span>
          ) : (
            <span>Free entry</span>
          )}
        </div>

        {t.description ? (
          <p className="line-clamp-2 text-sm text-zinc-500">{t.description}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-xs text-zinc-500">
            {status === "upcoming"
              ? regOpen
                ? reg.kind === "closes"
                  ? `Registration closes ${fmtDateTime(reg.date)}`
                  : "Registration open"
                : `Registration opens ${fmtDateTime(reg.date)}`
              : status === "ongoing"
                ? "Event in progress"
                : "Completed"}
          </span>          <Link href={`/tournaments/${t.slug}`}>
          <Button size="sm" variant={status === "completed" ? "secondary" : "primary"}>
            {status === "completed" ? "View results" : "View & register"}
          </Button>
        </Link>
        </div>
      </div>
    </div>
  );
}
