/**
 * Self-contained esports-styled SVG art. Deterministic per name, so SSR and
 * client render identically. Used as the fallback wherever a real photo
 * (photo_url / hero_image_url) hasn't been set by staff.
 */

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

// Palette tuned to the dark esports theme — cohesive, never garish.
const HUES = [352, 265, 190, 330, 24, 142];

function hueFor(seed: string): number {
  return HUES[hash(seed) % HUES.length];
}

function initials(name: string, tag?: string | null): string {
  if (tag && tag.trim()) return tag.trim().slice(0, 3).toUpperCase();
  const clean = name.replace(/[^a-zA-Z ]/g, " ").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Z4K";
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ------------------------------ Member emblem ----------------------------- */

export function MemberEmblem({
  name,
  tag,
  photoUrl,
  size = 56,
}: {
  name: string;
  tag?: string | null;
  photoUrl?: string | null;
  size?: number;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        width={size}
        height={size}
        className="shrink-0 rounded-xl border border-zinc-700 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  const hue = hueFor(name + (tag ?? ""));
  const id = `mb-${hash(name + (tag ?? ""))}`;
  const label = initials(name, tag);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`${name} emblem`}
      className="shrink-0 rounded-xl border border-zinc-700"
      style={{ width: size, height: size }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`hsl(${hue} 70% 22%)`} />
          <stop offset="100%" stopColor={`hsl(${hue} 80% 10%)`} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" fill={`url(#${id})`} />
      {/* hex frame */}
      <polygon
        points="32,6 54,18 54,46 32,58 10,46 10,18"
        fill="none"
        stroke={`hsl(${hue} 85% 60%)`}
        strokeOpacity="0.55"
        strokeWidth="1.5"
      />
      {/* crosshair ticks */}
      <g stroke={`hsl(${hue} 85% 62%)`} strokeOpacity="0.8" strokeWidth="2" strokeLinecap="round">
        <line x1="32" y1="10" x2="32" y2="15" />
        <line x1="32" y1="49" x2="32" y2="54" />
        <line x1="10" y1="32" x2="15" y2="32" />
        <line x1="49" y1="32" x2="54" y2="32" />
      </g>
      <text
        x="32"
        y="38"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="16"
        fontWeight="900"
        fill="#fafafa"
        letterSpacing="1"
      >
        {label}
      </text>
    </svg>
  );
}

/* --------------------------- Tournament thumbnail ------------------------- */

export function TournamentThumb({
  name,
  game,
  heroUrl,
  className,
  showText = true,
}: {
  name: string;
  game?: string;
  heroUrl?: string | null;
  className?: string;
  showText?: boolean;
}) {
  if (heroUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={heroUrl}
        alt={name}
        className={`aspect-video w-full rounded-t-xl border-b border-zinc-800 object-cover ${className ?? ""}`}
      />
    );
  }

  const seed = name + (game ?? "");
  const hue = hueFor(seed);
  const gid = `tt-${hash(seed)}`;
  const gameLabel = (game ?? "ESPORTS")
    .replace(/\(.*?\)/g, "")
    .trim()
    .toUpperCase();
  const gameTag = gameLabel.length > 14 ? gameLabel.slice(0, 12) + "…" : gameLabel;
  const title = name.length > 34 ? name.slice(0, 32) + "…" : name;

  return (
    <svg
      viewBox="0 0 320 180"
      role="img"
      aria-label={`${name} banner`}
      className={`aspect-video w-full rounded-t-xl border-b border-zinc-800 ${className ?? ""}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`hsl(${hue} 65% 16%)`} />
          <stop offset="55%" stopColor={`hsl(${hue + 18} 60% 9%)`} />
          <stop offset="100%" stopColor="#0b0b0e" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${gid})`} />

      {/* diagonal speed stripes */}
      <g stroke={`hsl(${hue} 80% 55%)`} strokeOpacity="0.25" strokeWidth="10">
        <line x1="-20" y1="150" x2="120" y2="-10" />
        <line x1="30" y1="190" x2="190" y2="10" />
        <line x1="90" y1="210" x2="260" y2="20" />
      </g>

      {/* crosshair motif */}
      <g
        stroke={`hsl(${hue} 85% 62%)`}
        strokeOpacity="0.85"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <circle cx="256" cy="62" r="26" strokeOpacity="0.5" />
        <circle cx="256" cy="62" r="4" fill={`hsl(${hue} 85% 62%)`} stroke="none" />
        <line x1="256" y1="24" x2="256" y2="38" />
        <line x1="256" y1="86" x2="256" y2="100" />
        <line x1="218" y1="62" x2="232" y2="62" />
        <line x1="280" y1="62" x2="294" y2="62" />
      </g>

      {/* hex chip */}
      <polygon
        points="28,24 46,34 46,54 28,64 10,54 10,34"
        fill={`hsl(${hue} 80% 55%)`}
        fillOpacity="0.2"
        stroke={`hsl(${hue} 85% 62%)`}
        strokeWidth="1.5"
      />
      <text
        x="28"
        y="49"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="13"
        fontWeight="900"
        fill={`hsl(${hue} 90% 75%)`}
      >
        Z4K
      </text>

      {/* title + game tag */}
      {showText ? (
        <>
          <text
            x="20"
            y="118"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontSize="20"
            fontWeight="900"
            fill="#fafafa"
          >
            {title.toUpperCase()}
          </text>
          <text
            x="20"
            y="146"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontSize="11"
            fontWeight="700"
            letterSpacing="3"
            fill={`hsl(${hue} 80% 68%)`}
          >
            {gameTag}
          </text>
        </>
      ) : null}
    </svg>
  );
}
