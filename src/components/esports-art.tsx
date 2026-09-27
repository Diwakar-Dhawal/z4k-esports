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
  fill = false,
}: {
  name: string;
  game?: string;
  heroUrl?: string | null;
  className?: string;
  showText?: boolean;
  /** Fill the parent box instead of imposing its own 16:9 aspect (hero banners). */
  fill?: boolean;
}) {
  if (heroUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={heroUrl}
        alt={name}
        className={
          fill
            ? `h-full w-full object-cover ${className ?? ""}`
            : `aspect-video w-full rounded-t-xl border-b border-zinc-800 object-cover ${className ?? ""}`
        }
      />
    );
  }

  const seed = name + (game ?? "");
  const hue = hueFor(seed);
  const gid = `tt-${hash(seed)}`;
  const gameLabel = (game ?? "ESPORTS").replace(/\(.*?\)/g, "").trim().toUpperCase();

  // Fill mode centers every motif on the vertical middle band, because the
  // "slice" crop on wide/tall containers keeps only that band — otherwise
  // the chip drifts to the top edge on big screens. The chip also moves
  // inward horizontally: tall-ish containers crop ~12 units off each side,
  // which clipped the chip at x=10 on phones.
  const cy = fill ? 90 : 62;
  const chipTop = fill ? 66 : 24;
  const chipCx = fill ? 56 : 28;

  const art = (
    <svg
      viewBox="0 0 320 180"
      role="img"
      aria-label={`${name} banner`}
      className="h-full w-full"
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
        <circle cx="256" cy={cy} r="26" strokeOpacity="0.5" />
        <circle cx="256" cy={cy} r="4" fill={`hsl(${hue} 85% 62%)`} stroke="none" />
        <line x1="256" y1={cy - 38} x2="256" y2={cy - 24} />
        <line x1="256" y1={cy + 24} x2="256" y2={cy + 38} />
        <line x1="218" y1={cy} x2="232" y2={cy} />
        <line x1="280" y1={cy} x2="294" y2={cy} />
      </g>

      {/* hex chip */}
      <polygon
        points={`${chipCx},${chipTop} ${chipCx + 18},${chipTop + 10} ${chipCx + 18},${chipTop + 30} ${chipCx},${chipTop + 40} ${chipCx - 18},${chipTop + 30} ${chipCx - 18},${chipTop + 10}`}
        fill={`hsl(${hue} 80% 55%)`}
        fillOpacity="0.2"
        stroke={`hsl(${hue} 85% 62%)`}
        strokeWidth="1.5"
      />
      <text
        x={chipCx}
        y={chipTop + 25}
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="13"
        fontWeight="900"
        fill={`hsl(${hue} 90% 75%)`}
      >
        Z4K
      </text>
    </svg>
  );

  // Fill mode: purely decorative art (title is overlaid by the page).
  if (fill) return <div className={`h-full w-full ${className ?? ""}`}>{art}</div>;

  // Card mode: art + HTML text overlay that scales with the viewport.
  return (
    <div
      className={`relative aspect-video w-full overflow-hidden rounded-t-xl border-b border-zinc-800 ${className ?? ""}`}
    >
      <div className="absolute inset-0">{art}</div>
      {showText ? (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 sm:p-4">
          <p className="line-clamp-2 text-sm font-black uppercase leading-tight text-white sm:text-base">
            {name}
          </p>
          <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-300 sm:text-[11px]">
            {gameLabel}
          </p>
        </div>
      ) : null}
    </div>
  );
}
