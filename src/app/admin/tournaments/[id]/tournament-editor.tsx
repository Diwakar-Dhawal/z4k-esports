"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Card, Checkbox, Field, Input, Spinner, Textarea } from "@/components/ui";
import { ImageUploadField } from "@/components/image-upload-field";
import type {
  Tournament,
  TournamentTemplate,
  RoomCredential,
  TournamentResult,
  TournamentPhoto,
  TournamentAward,
} from "@/lib/types";
import { deleteStoredImages } from "@/lib/storage-cleanup";

function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TournamentEditor({
  tournament: t,
  credentials: initialCreds,
  results: initialResults,
  photos: initialPhotos,
  awards: initialAwards,
  templates,
}: {
  tournament: Tournament;
  credentials: RoomCredential[];
  results: TournamentResult[];
  photos: TournamentPhoto[];
  awards: TournamentAward[];
  templates: TournamentTemplate[];
}) {
  const router = useRouter();
  const supabase = createClient();

  /* ------------------------------ details form ----------------------------- */
  const [busyStage, setBusyStage] = useState(false);
  const [name, setName] = useState(t.name);
  const [game, setGame] = useState(t.game);
  const [description, setDescription] = useState(t.description ?? "");
  const [teamSize, setTeamSize] = useState(t.team_size);
  const [subs, setSubs] = useState(t.substitutes_max);
  const [maxTeams, setMaxTeams] = useState(t.max_teams);
  const [fee, setFee] = useState(String(t.entry_fee_inr));
  const [upiNote, setUpiNote] = useState(t.upi_note ?? "");
  const [regStart, setRegStart] = useState(isoToLocalInput(t.registration_starts_at));
  const [regEnd, setRegEnd] = useState(isoToLocalInput(t.registration_ends_at));
  const [eventStart, setEventStart] = useState(isoToLocalInput(t.event_starts_at));
  const [eventEnd, setEventEnd] = useState(isoToLocalInput(t.event_ends_at));
  const [override, setOverride] = useState(t.status_override ?? "");
  const [autoApprove, setAutoApprove] = useState(t.auto_approve);
  const [requireVerified, setRequireVerified] = useState(t.require_verified_uids ?? false);
  const [rules, setRules] = useState(t.rules_md);
  const [liveId, setLiveId] = useState(t.youtube_live_id ?? "");
  const [vod, setVod] = useState(t.vod_url ?? "");
  const [hero, setHero] = useState(t.hero_image_url ?? "");
  const [waGroup, setWaGroup] = useState(t.whatsapp_group_link ?? "");
  const [managerContact, setManagerContact] = useState(t.manager_contact ?? "");
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsMsg, setDetailsMsg] = useState<string | null>(null);
  const [detailsErr, setDetailsErr] = useState<string | null>(null);

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSavingDetails(true);
    setDetailsMsg(null);
    setDetailsErr(null);
    const { error } = await supabase
      .from("tournaments")
      .update({
        name: name.trim(),
        game: game.trim(),
        description: description.trim() || null,
        team_size: teamSize,
        substitutes_max: subs,
        max_teams: maxTeams,
        entry_fee_inr: Number(fee) || 0,
        upi_note: upiNote.trim() || null,
        registration_starts_at: regStart ? new Date(regStart).toISOString() : null,
        registration_ends_at: regEnd ? new Date(regEnd).toISOString() : null,
        event_starts_at: eventStart ? new Date(eventStart).toISOString() : null,
        event_ends_at: eventEnd ? new Date(eventEnd).toISOString() : null,
        status_override: override === "" ? null : override,
        auto_approve: autoApprove,
        require_verified_uids: requireVerified,
        rules_md: rules,
        youtube_live_id: liveId.trim() || null,
        vod_url: vod.trim() || null,
        hero_image_url: hero.trim() || null,
        whatsapp_group_link: waGroup.trim() || null,
        manager_contact: managerContact.trim() || null,
      })
      .eq("id", t.id);
    setSavingDetails(false);
    if (error) {
      setDetailsErr(error.message);
      return;
    }
    setDetailsMsg("Saved.");
    router.refresh();
  }

  /* ---------------------------- room credentials --------------------------- */
  const [creds, setCreds] = useState(initialCreds);
  const [newCred, setNewCred] = useState({
    label: "Match Room 1",
    room_id: "",
    room_password: "",
    reveal_at: "",
  });
  const [credBusy, setCredBusy] = useState(false);
  const [credErr, setCredErr] = useState<string | null>(null);

  async function addCred(e: React.FormEvent) {
    e.preventDefault();
    setCredErr(null);
    if (!newCred.room_id.trim() || !newCred.room_password.trim())
      return setCredErr("Room ID and password are required.");
    if (!newCred.reveal_at) return setCredErr("Pick a reveal time.");
    setCredBusy(true);
    const { data, error } = await supabase
      .from("room_credentials")
      .insert({
        tournament_id: t.id,
        label: newCred.label.trim() || "Match Room",
        room_id: newCred.room_id.trim(),
        room_password: newCred.room_password.trim(),
        reveal_at: new Date(newCred.reveal_at).toISOString(),
      })
      .select();
    setCredBusy(false);
    if (error || !data) return setCredErr(error?.message ?? "Could not add credentials.");
    setCreds((rows) => [...rows, ...(data as RoomCredential[])]);
    setNewCred({ label: `Match Room ${creds.length + 2}`, room_id: "", room_password: "", reveal_at: "" });
  }

  async function deleteCred(id: string) {
    await supabase.from("room_credentials").delete().eq("id", id);
    setCreds((rows) => rows.filter((c) => c.id !== id));
  }

  /* -------------------------------- results -------------------------------- */
  const [results, setResults] = useState(initialResults);
  const [newResult, setNewResult] = useState({ placement: "1", team_name: "", team_tag: "", prize: "", image_url: "" });
  const [resultBusy, setResultBusy] = useState(false);
  const [resultErr, setResultErr] = useState<string | null>(null);

  async function addResult(e: React.FormEvent) {
    e.preventDefault();
    setResultErr(null);
    if (!newResult.team_name.trim()) return setResultErr("Team name is required.");
    setResultBusy(true);
    const { data, error } = await supabase
      .from("tournament_results")
      .insert({
        tournament_id: t.id,
        placement: Number(newResult.placement) || 1,
        team_name: newResult.team_name.trim(),
        team_tag: newResult.team_tag.trim() || null,
        prize: newResult.prize.trim() || null,
        image_url: newResult.image_url.trim() || null,
      })
      .select();
    setResultBusy(false);
    if (error || !data) return setResultErr(error?.message ?? "Could not add result.");
    setResults((rows) => [...rows, ...(data as TournamentResult[])].sort((a, b) => a.placement - b.placement));
    setNewResult({ placement: String(Number(newResult.placement) + 1), team_name: "", team_tag: "", prize: "", image_url: "" });
  }

  async function deleteResult(id: string) {
    const r = results.find((x) => x.id === id);
    await deleteStoredImages([r?.image_url]);
    await supabase.from("tournament_results").delete().eq("id", id);
    setResults((rows) => rows.filter((x) => x.id !== id));
  }

  /* ------------------------- individual awards (custom) --------------------- */
  const [awards, setAwards] = useState(initialAwards);
  const [newAward, setNewAward] = useState({ title: "", player_name: "", team_name: "", image_url: "" });
  const [awardBusy, setAwardBusy] = useState(false);
  const [awardErr, setAwardErr] = useState<string | null>(null);

  async function addAward(e: React.FormEvent) {
    e.preventDefault();
    setAwardErr(null);
    if (!newAward.title.trim()) return setAwardErr("Award title is required (e.g. Field Medic).");
    if (!newAward.player_name.trim()) return setAwardErr("Player name is required.");
    setAwardBusy(true);
    const { data, error } = await supabase
      .from("tournament_awards")
      .insert({
        tournament_id: t.id,
        title: newAward.title.trim(),
        player_name: newAward.player_name.trim(),
        team_name: newAward.team_name.trim() || null,
        image_url: newAward.image_url.trim() || null,
        sort_order: awards.length,
      })
      .select();
    setAwardBusy(false);
    if (error || !data) return setAwardErr(error?.message ?? "Could not add award.");
    setAwards((rows) => [...rows, ...(data as TournamentAward[])]);
    setNewAward({ title: "", player_name: "", team_name: "", image_url: "" });
  }

  async function deleteAward(id: string) {
    const a = awards.find((x) => x.id === id);
    await deleteStoredImages([a?.image_url]);
    await supabase.from("tournament_awards").delete().eq("id", id);
    setAwards((rows) => rows.filter((x) => x.id !== id));
  }

  /* --------------------------------- photos -------------------------------- */
  const [photos, setPhotos] = useState(initialPhotos);
  const [newPhoto, setNewPhoto] = useState({ image_url: "", caption: "" });
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState<string | null>(null);

  async function addPhoto(e: React.FormEvent) {
    e.preventDefault();
    setPhotoErr(null);
    if (!newPhoto.image_url.trim()) return setPhotoErr("Image URL is required.");
    setPhotoBusy(true);
    const { data, error } = await supabase
      .from("tournament_photos")
      .insert({
        tournament_id: t.id,
        image_url: newPhoto.image_url.trim(),
        caption: newPhoto.caption.trim() || null,
        sort_order: photos.length,
      })
      .select();
    setPhotoBusy(false);
    if (error || !data) return setPhotoErr(error?.message ?? "Could not add photo.");
    setPhotos((rows) => [...rows, ...(data as TournamentPhoto[])]);
    setNewPhoto({ image_url: "", caption: "" });
  }

  async function deletePhoto(id: string) {
    const p = photos.find((x) => x.id === id);
    await deleteStoredImages([p?.image_url]);
    await supabase.from("tournament_photos").delete().eq("id", id);
    setPhotos((rows) => rows.filter((x) => x.id !== id));
  }

  /* ------------------------- status promotion quick actions ---------------- */
  const currentStatus = override || "auto";
  async function promote(status: "upcoming" | "ongoing" | "completed" | "") {
    setBusyStage(true);
    await supabase
      .from("tournaments")
      .update({ status_override: status === "" ? null : status })
      .eq("id", t.id);
    setOverride(status);
    setBusyStage(false);
    router.refresh();
  }

  /* -------------------------------- archive -------------------------------- */
  const [archived, setArchived] = useState(Boolean(t.archived_at));

  async function toggleArchive() {
    const next = !archived;
    await supabase
      .from("tournaments")
      .update({ archived_at: next ? new Date().toISOString() : null })
      .eq("id", t.id);
    setArchived(next);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* Details */}
      <form onSubmit={saveDetails}>
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">Details</h2>
            <div className="flex items-center gap-2">
              {archived ? <Badge tone="red">archived</Badge> : null}
              <Link href={`/tournaments/${t.slug}`} target="_blank">
                <Button size="sm" variant="ghost" type="button">View public page ↗</Button>
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
              Stage — click to promote instantly
            </p>
            <div className="flex flex-wrap gap-2">
              {([
                { key: "upcoming", label: "⏳ Upcoming (coming soon)" },
                { key: "ongoing", label: "🔴 Live now" },
                { key: "completed", label: "🏁 Ended" },
              ] as const).map((s) => (
                <Button
                  key={s.key}
                  size="sm"
                  type="button"
                  variant={currentStatus === s.key ? "primary" : "secondary"}
                  disabled={busyStage}
                  onClick={() => promote(s.key)}
                >
                  {s.label}
                </Button>
              ))}
              <Button size="sm" type="button" variant="ghost" disabled={busyStage}
                className={currentStatus === "auto" ? "ring-2 ring-zinc-600" : ""}
                onClick={() => promote("")}>
                ⚙️ Auto (from dates)
              </Button>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Current: <strong className="text-zinc-300">{currentStatus === "auto" ? "auto from dates" : override}</strong>.
              Upcoming shows “coming soon” until registration opens; Live embeds the YouTube stream; Ended shows results & photos and hides slots.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Game"><Input value={game} onChange={(e) => setGame(e.target.value)} /></Field>
          </div>
          <Field label="Description">
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Players / team"><Input type="number" min={1} max={10} value={teamSize} onChange={(e) => setTeamSize(Number(e.target.value))} /></Field>
            <Field label="Subs / team"><Input type="number" min={0} max={4} value={subs} onChange={(e) => setSubs(Number(e.target.value))} /></Field>
            <Field label="Max teams"><Input type="number" min={2} max={512} value={maxTeams} onChange={(e) => setMaxTeams(Number(e.target.value))} /></Field>
            <Field label="Entry fee (₹)"><Input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} /></Field>
          </div>

          <Field label="UPI / payment note">
            <Input value={upiNote} onChange={(e) => setUpiNote(e.target.value)} placeholder="UPI: z4k@upi — send screenshot to manager" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Registration opens"><Input type="datetime-local" value={regStart} onChange={(e) => setRegStart(e.target.value)} /></Field>
            <Field label="Registration closes"><Input type="datetime-local" value={regEnd} onChange={(e) => setRegEnd(e.target.value)} /></Field>
            <Field label="Event starts"><Input type="datetime-local" value={eventStart} onChange={(e) => setEventStart(e.target.value)} /></Field>
            <Field label="Event ends"><Input type="datetime-local" value={eventEnd} onChange={(e) => setEventEnd(e.target.value)} /></Field>
          </div>

          <Field label="Status override" hint="Optional — forces the section this tournament appears in. Leave blank to derive from dates.">
            <select className="z4k-input" value={override} onChange={(e) => setOverride(e.target.value)}>
              <option value="">Auto (from dates)</option>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </Field>

          <Field label="Rules (markdown)">
            <Textarea rows={8} value={rules} onChange={(e) => setRules(e.target.value)} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="YouTube live video ID" hint="Only the ID, e.g. 5qap5aO4i9A — used while event is ongoing.">
              <Input value={liveId} onChange={(e) => setLiveId(e.target.value)} />
            </Field>
            <Field label="VOD URL (past tournaments)">
              <Input value={vod} onChange={(e) => setVod(e.target.value)} placeholder="https://youtube.com/..." />
            </Field>
            <div className="sm:col-span-2">
              <ImageUploadField
                bucket="tournament-media"
                folder="banners"
                label="Tournament banner / thumbnail (upload or URL)"
                value={hero}
                onChange={setHero}
                hint="Shown on cards, the tournaments page and this page. Left empty → generated esports banner."
              />
            </div>
            <Field label="WhatsApp group invite link"><Input value={waGroup} onChange={(e) => setWaGroup(e.target.value)} /></Field>
            <Field label="Manager WhatsApp (digits)"><Input value={managerContact} onChange={(e) => setManagerContact(e.target.value)} placeholder="919876543210" /></Field>
          </div>

          <Checkbox
            checked={autoApprove}
            onChange={(e) => setAutoApprove(e.target.checked)}
            label="Auto-approve registrations (instant confirmation, race-safe slot granting)"
          />
          <Checkbox
            checked={requireVerified}
            onChange={(e) => setRequireVerified(e.target.checked)}
            label="Require HL-Gaming-verified UIDs for instant approval (unverified teams go to review queue)"
          />

          {detailsMsg ? <div className="z4k-success">{detailsMsg}</div> : null}
          {detailsErr ? <div className="z4k-error">{detailsErr}</div> : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={savingDetails}>
              {savingDetails ? <Spinner /> : null} Save details
            </Button>
            <Button type="button" variant="danger" onClick={toggleArchive}>
              {archived ? "Restore tournament" : "Archive tournament"}
            </Button>
          </div>
        </Card>
      </form>

      {/* Individual awards — custom roles/titles */}
      <Card className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">🥇 Individual awards</h2>
        <p className="text-xs text-zinc-500">
          Custom titles — Field Medic, Best Assaulter, MVP, Rising Star… anything. Each can carry a
          player photo shown with their name on the public page.
        </p>
        <div className="space-y-2">
          {awards.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
              <div className="flex min-w-0 items-center gap-3">
                {a.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.image_url} alt={a.player_name} className="h-10 w-10 rounded-full border border-zinc-700 object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600/20 text-xs font-black text-red-400">
                    {a.player_name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{a.player_name}</p>
                  <p className="truncate text-xs text-red-400">{a.title}{a.team_name ? ` · ${a.team_name}` : ""}</p>
                </div>
              </div>
              <Button size="sm" variant="danger" onClick={() => deleteAward(a.id)}>Delete</Button>
            </div>
          ))}
          {awards.length === 0 ? <p className="text-sm text-zinc-500">No awards yet.</p> : null}
        </div>
        <form onSubmit={addAward} className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-4">
            <input className="z4k-input" placeholder="Award title * (Field Medic)" value={newAward.title} onChange={(e) => setNewAward({ ...newAward, title: e.target.value })} />
            <input className="z4k-input" placeholder="Player name *" value={newAward.player_name} onChange={(e) => setNewAward({ ...newAward, player_name: e.target.value })} />
            <input className="z4k-input" placeholder="Team (optional)" value={newAward.team_name} onChange={(e) => setNewAward({ ...newAward, team_name: e.target.value })} />
            <Button type="submit" size="sm" disabled={awardBusy}>{awardBusy ? <Spinner /> : null} Add award</Button>
          </div>
          <ImageUploadField
            bucket="tournament-media"
            folder="awards"
            label="Player photo (optional)"
            value={newAward.image_url}
            onChange={(url) => setNewAward((p) => ({ ...p, image_url: url }))}
          />
        </form>
        {awardErr ? <div className="z4k-error">{awardErr}</div> : null}
      </Card>

      {/* Room credentials */}
      <Card className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">
          🔑 Room credentials
        </h2>
        <p className="text-xs text-zinc-500">
          Visible only to approved captains (and staff) after the reveal time.
        </p>
        <div className="space-y-2">
          {creds.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-white">{c.label}</p>
                <p className="text-xs text-zinc-500">
                  ID {c.room_id} · Pass {c.room_password} · reveals {new Date(c.reveal_at).toLocaleString("en-IN")}
                </p>
              </div>
              <Button size="sm" variant="danger" onClick={() => deleteCred(c.id)}>Delete</Button>
            </div>
          ))}
          {creds.length === 0 ? <p className="text-sm text-zinc-500">None yet.</p> : null}
        </div>
        <form onSubmit={addCred} className="grid gap-2 sm:grid-cols-5">
          <input className="z4k-input" placeholder="Label" value={newCred.label} onChange={(e) => setNewCred({ ...newCred, label: e.target.value })} />
          <input className="z4k-input" placeholder="Room ID" value={newCred.room_id} onChange={(e) => setNewCred({ ...newCred, room_id: e.target.value })} />
          <input className="z4k-input" placeholder="Password" value={newCred.room_password} onChange={(e) => setNewCred({ ...newCred, room_password: e.target.value })} />
          <input className="z4k-input" type="datetime-local" value={newCred.reveal_at} onChange={(e) => setNewCred({ ...newCred, reveal_at: e.target.value })} />
          <Button type="submit" size="sm" disabled={credBusy}>{credBusy ? <Spinner /> : null} Add</Button>
        </form>
        {credErr ? <div className="z4k-error">{credErr}</div> : null}
      </Card>

      {/* Results + winner photos */}
      <Card className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">🏆 Results & photos</h2>
        <div className="space-y-2">
          {results.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
              <span className="text-sm text-zinc-200">
                <strong className="mr-2 text-yellow-400">#{r.placement}</strong>
                {r.team_tag ? `[${r.team_tag}] ` : ""}{r.team_name}
                {r.prize ? <span className="ml-2 text-xs text-zinc-500">{r.prize}</span> : null}
              </span>
              <Button size="sm" variant="danger" onClick={() => deleteResult(r.id)}>Delete</Button>
            </div>
          ))}
          {results.length === 0 ? <p className="text-sm text-zinc-500">No results yet.</p> : null}
        </div>
        <form onSubmit={addResult} className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-5">
            <input className="z4k-input" type="number" min={1} placeholder="#" value={newResult.placement} onChange={(e) => setNewResult({ ...newResult, placement: e.target.value })} />
            <input className="z4k-input sm:col-span-2" placeholder="Team name" value={newResult.team_name} onChange={(e) => setNewResult({ ...newResult, team_name: e.target.value })} />
            <input className="z4k-input" placeholder="Tag" value={newResult.team_tag} onChange={(e) => setNewResult({ ...newResult, team_tag: e.target.value })} />
            <input className="z4k-input" placeholder="Prize" value={newResult.prize} onChange={(e) => setNewResult({ ...newResult, prize: e.target.value })} />
          </div>
          <ImageUploadField
            bucket="tournament-media"
            folder="results"
            label="Team image — winner photo with the squad (optional)"
            value={newResult.image_url}
            onChange={(url) => setNewResult((p) => ({ ...p, image_url: url }))}
          />
          <Button type="submit" size="sm" disabled={resultBusy}>{resultBusy ? <Spinner /> : null} Add result</Button>
        </form>
        {resultErr ? <div className="z4k-error">{resultErr}</div> : null}

        <div className="border-t border-zinc-800 pt-4">
          <h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-zinc-400">
            📷 Winner & event photos
          </h3>
          <p className="mb-3 text-xs text-zinc-500">
            Shown under results on the public page — winner podium shots, trophy photos, highlights.
          </p>
          {photos.length > 0 ? (
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((p) => (
                <div key={p.id} className="group relative overflow-hidden rounded-lg border border-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image_url} alt={p.caption ?? ""} className="aspect-video w-full object-cover" />
                  <button
                    onClick={() => deletePhoto(p.id)}
                    className="absolute right-1 top-1 rounded bg-red-600/90 px-1.5 py-0.5 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-3 text-sm text-zinc-500">No photos yet.</p>
          )}
          <form onSubmit={addPhoto} className="space-y-2">
            <ImageUploadField
              bucket="tournament-media"
              folder="gallery"
              label="Upload result photo (or paste URL)"
              value={newPhoto.image_url}
              onChange={(url) => setNewPhoto((p) => ({ ...p, image_url: url }))}
            />
            <div className="flex flex-wrap gap-2">
              <input className="z4k-input flex-1" placeholder="Caption (e.g. Champions — Team Nova)" value={newPhoto.caption} onChange={(e) => setNewPhoto({ ...newPhoto, caption: e.target.value })} />
              <Button type="submit" size="sm" disabled={photoBusy}>{photoBusy ? <Spinner /> : null} Add photo</Button>
            </div>
          </form>
          {photoErr ? <div className="z4k-error">{photoErr}</div> : null}
        </div>
      </Card>

      {/* Public slot list note for completed events is automatic — slot panel hides itself */}
    </div>
  );
}
