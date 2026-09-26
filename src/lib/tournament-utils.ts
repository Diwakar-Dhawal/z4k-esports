export type TournamentStatus = "upcoming" | "ongoing" | "completed";

/**
 * Effective status: manual override wins, else derived from event dates.
 */
export function tournamentStatus(t: {
  status_override: string | null;
  event_starts_at: string | null;
  event_ends_at: string | null;
}): TournamentStatus {
  if (
    t.status_override === "upcoming" ||
    t.status_override === "ongoing" ||
    t.status_override === "completed"
  ) {
    return t.status_override;
  }
  const now = Date.now();
  const starts = t.event_starts_at ? new Date(t.event_starts_at).getTime() : null;
  const ends = t.event_ends_at ? new Date(t.event_ends_at).getTime() : null;
  if (starts && now < starts) return "upcoming";
  if (ends && now > ends) return "completed";
  return "ongoing";
}

export function isRegistrationOpen(t: {
  registration_starts_at: string | null;
  registration_ends_at: string | null;
}): boolean {
  const now = Date.now();
  const start = t.registration_starts_at ? new Date(t.registration_starts_at).getTime() : null;
  const end = t.registration_ends_at ? new Date(t.registration_ends_at).getTime() : null;
  return (start === null || now >= start) && (end === null || now <= end);
}

export function regState(t: {
  registration_starts_at: string | null;
  registration_ends_at: string | null;
}): { kind: "opens" | "closes" | "closed" | "open"; date: string | null } {
  const now = Date.now();
  const start = t.registration_starts_at ? new Date(t.registration_starts_at).getTime() : null;
  const end = t.registration_ends_at ? new Date(t.registration_ends_at).getTime() : null;
  if (start && now < start) return { kind: "opens", date: t.registration_starts_at };
  if (end && now > end) return { kind: "closed", date: null };
  if (end) return { kind: "closes", date: t.registration_ends_at };
  return { kind: "open", date: null };
}

const IST = "Asia/Kolkata";

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || `t-${Date.now().toString(36)}`;
}

/** Native-ish WhatsApp deep link with prefilled message. */
export function waMeLink(raw: string, message?: string): string {
  const digits = raw.replace(/\D/g, "");
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

/** YouTube embed URL (works for live & VOD). */
export function youtubeEmbed(id: string): string {
  return `https://www.youtube.com/embed/${id}`;
}

/** naive markdown → JSX-safe HTML for rules rendering */
export function renderSimpleMarkdown(md: string): string {
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^\- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, "<ul>$1</ul>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .split(/\n{2,}/)
    .map((block) => (/^<(h\d|ul|li)/.test(block.trim()) ? block : `<p>${block.replace(/\n/g, "<br/>")}</p>`))
    .join("\n");
}

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  user: "User",
};
