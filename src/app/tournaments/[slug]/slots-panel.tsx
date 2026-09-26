import { Badge, Card } from "@/components/ui";

export function SlotsPanel({
  maxTeams,
  approved,
  pending,
  teams,
}: {
  maxTeams: number;
  approved: number;
  pending: number;
  teams: Array<{ name: string; tag: string | null }>;
}) {
  const pct = Math.min(100, Math.round((approved / Math.max(1, maxTeams)) * 100));

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">
          Slot list
        </h2>
        <div className="flex items-center gap-2">
          <Badge tone="green">{approved} approved</Badge>
          {pending > 0 ? <Badge tone="yellow">{pending} pending</Badge> : null}
          <Badge tone="gray">{maxTeams - approved} left</Badge>
        </div>
      </div>

      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-red-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {teams.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No approved teams yet — be the first to lock a slot.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {teams.map((team, i) => (
            <div
              key={`${team.name}-${i}`}
              className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2"
            >
              <span className="text-xs font-black text-zinc-600">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="truncate text-sm text-zinc-200">
                {team.tag ? <span className="text-red-400">[{team.tag}] </span> : null}
                {team.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
