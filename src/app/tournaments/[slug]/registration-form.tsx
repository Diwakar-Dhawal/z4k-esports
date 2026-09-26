"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { registrationErrorToMessage } from "@/lib/registration-errors";
import { Button, Checkbox, Field, Input, Spinner } from "@/components/ui";
import type { TeamPreset, VerificationInfo } from "@/lib/types";

interface PlayerRow {
  ign: string;
  uid: string;
  player_role: string;
}

const ROLE_SUGGESTIONS = ["IGL", "Assaulter", "Sniper", "Support", "Rusher", "Scout"];

export function RegistrationForm({
  tournamentId,
  teamSize,
  substitutesMax,
  rulesMd,
  captainName,
  autoApprove,
}: {
  tournamentId: string;
  teamSize: number;
  substitutesMax: number;
  rulesMd: string;
  captainName: string | null;
  autoApprove: boolean;
}) {
  const router = useRouter();
  const maxPlayers = teamSize + substitutesMax;

  const [guestName, setGuestName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamTag, setTeamTag] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [players, setPlayers] = useState<PlayerRow[]>(
    Array.from({ length: teamSize }, () => ({ ign: "", uid: "", player_role: "" })),
  );
  const [agree, setAgree] = useState(false);
  const [savePreset, setSavePreset] = useState(true);
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});
  const [verifications, setVerifications] = useState<Record<string, VerificationInfo | null>>({});
  const [presets, setPresets] = useState<TeamPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ status: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const [{ data: presetData }, { data: profileData }] = await Promise.all([
        supabase
          .from("team_presets")
          .select("*, preset_players(*)")
          .order("created_at", { ascending: false }),
        supabase.from("users").select("whatsapp").eq("id", userData.user.id).single(),
      ]);
      if (presetData) setPresets(presetData as TeamPreset[]);
      if (profileData?.whatsapp) setWhatsapp(profileData.whatsapp);
    })();
  }, []);

  const uidIssue = useMemo(
    () => players.findIndex((p) => p.uid !== "" && !/^[0-9]{5,12}$/.test(p.uid.trim())),
    [players],
  );

  function setPlayer(i: number, patch: Partial<PlayerRow>) {
    setPlayers((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function clearIgnName(i: number) {
    setVerifications((v) => ({ ...v, [i]: null }));
    setPlayers((rows) => rows.map((r, idx) => (idx === i ? { ...r, ign: "" } : r)));
  }

  async function verifyUid(i: number, rawUid: string) {
    const uid = rawUid.trim();
    if (!/^[0-9]{5,12}$/.test(uid)) return;
    setVerifying((v) => ({ ...v, [uid]: true }));
    try {
      const res = await fetch("/api/verify-uid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
      const data = (await res.json()) as VerificationInfo;
      setVerifications((v) => ({ ...v, [uid]: data }));
    } catch {
      setVerifications((v) => ({
        ...v,
        [uid]: {
          verified: false,
          retryable: true,
          officialUsername: null,
          checkedAt: new Date().toISOString(),
          message: "Couldn't reach the verification service.",
        },
      }));
    } finally {
      setVerifying((v) => ({ ...v, [uid]: false }));
    }
  }

  function applyPreset(id: string) {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    setTeamName(preset.name);
    const rows: PlayerRow[] = preset.preset_players
      .slice(0, maxPlayers)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((p) => ({
        ign: p.ign,
        uid: p.uid,
        player_role: p.player_role ?? "",
      }));
    while (rows.length < teamSize) rows.push({ ign: "", uid: "", player_role: "" });
    setVerifications({});
    setPlayers(rows);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!captainName && !guestName.trim()) return setError("Your name is required (captain contact).");
    if (!teamName.trim()) return setError("Team name is required.");
    if (whatsapp.replace(/\D/g, "").length < 10)
      return setError("Enter a valid WhatsApp number (at least 10 digits).");
    if (players.slice(0, teamSize).some((p) => !p.ign.trim()))
      return setError("Every player needs an in-game name.");
    if (players.slice(0, teamSize).some((p) => !/^[0-9]{5,12}$/.test(p.uid.trim())))
      return setError("Every player needs a valid game UID (5–12 digits).");
    if (uidIssue !== -1)
      return setError(`Player ${uidIssue + 1}: UID must be 5–12 digits.`);
    if (!agree) return setError("You must accept the rules to register.");

    setLoading(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("register_team", {
      p_tournament_id: tournamentId,
      p_team_name: teamName.trim(),
      p_team_tag: teamTag.trim() || null,
      p_whatsapp: whatsapp,
      p_guest_name: captainName ? null : guestName.trim(),
      p_players: players.map((p, i) => ({
        ign: p.ign.trim(),
        uid: p.uid.trim(),
        player_role: p.player_role.trim() || null,
        sort_order: i,
      })),
      p_verified_names:
        players.length > 0 &&
        players.every((p) => verifications[p.uid.trim()]?.verified) === true
          ? Object.fromEntries(
              players.map((p) => [p.uid.trim(), verifications[p.uid.trim()]!.officialUsername]),
            )
          : {},
      p_agree_rules: agree,
    });

    if (rpcError) {
      setError(registrationErrorToMessage(rpcError.message));
      setLoading(false);
      return;
    }

    if (savePreset) {
      await supabase.from("team_presets").insert({
        name: teamName.trim(),
        preset_players: players
          .filter((p) => p.ign.trim() && p.uid.trim())
          .map((p, i) => ({
            ign: p.ign.trim(),
            uid: p.uid.trim(),
            player_role: p.player_role.trim() || null,
            sort_order: i,
            verified_at: verifications[p.uid.trim()]?.verified
              ? verifications[p.uid.trim()]!.checkedAt
              : null,
          })),
      });
    }

    // Logged-in captains can read their registration back; guests derive
    // status from the tournament's approval mode (RLS hides the row from them).
    if (captainName) {
      const { data: regData } = await supabase
        .from("registrations")
        .select("status")
        .eq("id", data as string)
        .single();
      setSuccess({ status: regData?.status ?? "pending" });
    } else {
      setSuccess({ status: autoApprove ? "approved" : "pending" });
    }
    setLoading(false);
    router.refresh();
  }

  if (success) {
    return (
      <div className="space-y-4">
        <div className="z4k-success">
          <p className="font-bold">Team registered!</p>
          <p className="mt-1">
            {success.status === "approved"
              ? "You're approved — see you in the lobby."
              : "Your registration is pending manager review."}
          </p>
        </div>
        {success.status === "approved" ? (
          <Link href="room">
            <Button className="w-full">Open Captain&apos;s Room</Button>
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {presets.length > 0 ? (
        <Field label="Load a saved team">
          <select className="z4k-input" defaultValue="" onChange={(e) => applyPreset(e.target.value)}>
            <option value="" disabled>
              Choose a preset…
            </option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.preset_players?.length ?? 0} players)
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <div className="grid grid-cols-[1fr_100px] gap-3">
        <Field label="Team name *">
          <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team Z4K" required />
        </Field>
        <Field label="Tag">
          <Input value={teamTag} onChange={(e) => setTeamTag(e.target.value)} placeholder="Z4K" maxLength={6} />
        </Field>
      </div>

      {captainName ? (
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-400">
          Registering as <strong className="text-zinc-200">{captainName}</strong> (signed in) — your
          dashboard will track this team.
        </p>
      ) : (
        <Field label="Your name (captain) *" hint="No account needed — tournament updates go to the WhatsApp number below.">
          <Input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="e.g. Rohit Sharma"
            required={!captainName}
          />
        </Field>
      )}

      <Field label="WhatsApp number *">
        <Input
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="9876543210"
          inputMode="tel"
          required
        />
      </Field>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="z4k-label mb-0">
            Players ({teamSize} required{substitutesMax > 0 ? ` + ${substitutesMax} sub max` : ""})
          </span>
          {players.length < maxPlayers ? (
            <button
              type="button"
              onClick={() =>
                setPlayers((rows) => [...rows, { ign: "", uid: "", player_role: "" }])
              }
              className="text-xs font-semibold text-red-400 hover:text-red-300"
            >
              + Add substitute
            </button>
          ) : null}
        </div>
        {players.map((p, i) => (
          <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                {i < teamSize ? `Player ${i + 1}` : `Substitute ${i - teamSize + 1}`}
                {verifying[p.uid.trim()] ? <Spinner className="text-red-400" /> : null}
              </span>
              {players.length > teamSize ? (
                <button
                  type="button"
                  onClick={() => setPlayers((rows) => rows.filter((_, idx) => idx !== i))}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <input
                  className="z4k-input"
                  placeholder="In-game name *"
                  value={p.ign}
                  readOnly={Boolean(verifications[p.uid.trim()]?.verified)}
                  onChange={(e) => setPlayer(i, { ign: e.target.value })}
                />
                {verifications[p.uid.trim()] ? (
                  verifications[p.uid.trim()]!.verified ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-green-400">
                        ✓ Verified as “{verifications[p.uid.trim()]!.officialUsername}”
                      </span>
                      <button
                        type="button"
                        onClick={() => clearIgnName(i)}
                        className="text-[11px] text-zinc-500 underline hover:text-zinc-300"
                      >
                        use a different name
                      </button>
                    </div>
                  ) : (
                    <span className="flex flex-wrap items-center gap-2 text-[11px] text-yellow-400">
                      <span>⚠ {verifications[p.uid.trim()]!.message}</span>
                      {verifications[p.uid.trim()]!.retryable ? (
                        <button
                          type="button"
                          onClick={() => verifyUid(i, p.uid)}
                          className="text-[11px] text-red-400 underline hover:text-red-300"
                        >
                          ↻ Retry
                        </button>
                      ) : null}
                    </span>
                  )
                ) : (
                  <span className="text-[11px] text-zinc-600">
                    Name is filled automatically once the UID is verified.
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <input
                  className="z4k-input"
                  placeholder="UID *"
                  inputMode="numeric"
                  value={p.uid}
                  onBlur={(e) => verifyUid(i, e.target.value)}
                  onChange={(e) => setPlayer(i, { uid: e.target.value.replace(/[^0-9]/g, "") })}
                />
                <span className="text-[11px] text-zinc-600">
                  Leaves the field → auto-verifies against BGMI servers.
                </span>
              </div>
            </div>
            <input
              className="z4k-input mt-2"
              placeholder="Role (e.g. IGL, Sniper) — optional"
              list="role-suggestions"
              value={p.player_role}
              onChange={(e) => setPlayer(i, { player_role: e.target.value })}
            />
          </div>
        ))}
        <datalist id="role-suggestions">
          {ROLE_SUGGESTIONS.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
        {uidIssue !== -1 ? (
          <p className="text-xs text-red-400">
            Player {uidIssue + 1}: UID must be 5–12 digits.
          </p>
        ) : null}
        {players.some((p) => p.uid.trim() && verifications[p.uid.trim()] && !verifications[p.uid.trim()]!.verified) ? (
          <p className="text-xs text-yellow-400">
            Some UIDs couldn't be verified. You can still submit — those players will be checked
            manually during review.
          </p>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-zinc-800 pt-3">
        <Checkbox
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          label={
            <span>
              I have read and accept the{" "}
              <a href="#rules-anchor" className="text-red-400 underline">
                tournament rules
              </a>{" "}
              and fair-play policy.
            </span>
          }
        />
        <Checkbox
          checked={savePreset}
          onChange={(e) => setSavePreset(e.target.checked)}
          label="Save this team to my dashboard for faster future registrations"
        />
      </div>

      {error ? <div className="z4k-error">{error}</div> : null}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? <Spinner /> : null}
        {loading ? "Registering…" : "Register team"}
      </Button>
      <p className="text-xs text-zinc-500">
        One registration per player UID and per WhatsApp number in this tournament.
        Duplicate IGNs are flagged for review. No account needed — sign in later to manage
        presets and access the Captain&apos;s Room.
      </p>
    </form>
  );
}
