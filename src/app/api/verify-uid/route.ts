import { NextResponse } from "next/server";
import type { VerificationInfo } from "@/lib/types";

/**
 * Server-side proxy for the HL Gaming BGMI UID validation API.
 * - Keeps the developer UID + API key server-only (works for guests too).
 * - Rate limits per IP (10/hour) and globally (400/day cushion under free quota).
 * - Caches positive verifications ~10 min (the API's own recommendation).
 * - Never blocks registration: on quota/error we return verified:false with a
 *   friendly message and the client falls back to manual review.
 */

const HL_ENDPOINT = "https://apis.hlgamingofficial.com/main/games/bgmi/validation/api";
const HL_USERUID = process.env.HL_GAMING_DEV_UID ?? "";
const HL_API_KEY = process.env.HL_GAMING_API_KEY ?? "";

const CACHE_TTL_MS = 10 * 60 * 1000;
const PER_IP_LIMIT = 10; // verifications per IP per hour
const GLOBAL_LIMIT = 400; // conservative daily cushion under the free quota

const cache = new Map<string, { info: VerificationInfo; expires: number }>();
const ipHits = new Map<string, { count: number; windowStart: number }>();
let globalCount = 0;
let globalDay = new Date().getUTCDate();

function tooMany(msg: string): NextResponse {
  return NextResponse.json(
    {
      verified: false,
      retryable: false,
      officialUsername: null,
      checkedAt: new Date().toISOString(),
      message: msg,
    } satisfies VerificationInfo,
    { status: 200 },
  );
}

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  if (!HL_USERUID || !HL_API_KEY) {
    return tooMany(
      "UID verification isn't configured yet — this player will be checked manually during review.",
    );
  }

  // Per-IP sliding window
  const ip = clientIp(request);
  const now = Date.now();
  const hits = ipHits.get(ip);
  if (!hits || now - hits.windowStart > 60 * 60 * 1000) {
    ipHits.set(ip, { count: 1, windowStart: now });
  } else if (hits.count >= PER_IP_LIMIT) {
    return tooMany("Too many verifications from this network — try again later.");
  } else {
    hits.count += 1;
  }

  // Global daily counter (approximate reset at UTC midnight)
  if (globalDay !== new Date().getUTCDate()) {
    globalDay = new Date().getUTCDate();
    globalCount = 0;
  }
  if (globalCount >= GLOBAL_LIMIT) {
    return tooMany("Daily verification quota reached — this player will be checked manually.");
  }

  let uid: unknown;
  try {
    uid = (await request.json())?.uid;
  } catch {
    return tooMany("Malformed request.");
  }
  if (typeof uid !== "string" || !/^[0-9]{5,12}$/.test(uid)) {
    return tooMany("UID must be 5–12 digits.");
  }

  const cached = cache.get(uid);
  if (cached && cached.expires > now) {
    return NextResponse.json(cached.info);
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${HL_ENDPOINT}?sectionName=verify-bgmi&useruid=${encodeURIComponent(HL_USERUID)}&api=${encodeURIComponent(HL_API_KEY)}&uid=${encodeURIComponent(uid)}`,
      { cache: "no-store" },
    );
  } catch {
    return tooMany("Verification service unreachable — this player will be checked manually.");
  }

  if (upstream.status === 429) {
    return tooMany("Verification quota exhausted — this player will be checked manually.");
  }
  if (upstream.status === 403) {
    return tooMany("Verification credentials rejected — check HL_GAMING_* env vars.");
  }
  if (!upstream.ok) {
    // 5xx from HL = their upstream BGMI check is down (auth already passed).
    // Treat as retryable; the client offers a Retry button.
    return NextResponse.json(
      {
        verified: false,
        retryable: upstream.status >= 500,
        officialUsername: null,
        checkedAt: new Date().toISOString(),
        message:
          upstream.status >= 500
            ? "BGMI verification service is temporarily down — retry in a bit, or submit and the player will be checked manually."
            : `Verification error (HTTP ${upstream.status}) — this player will be checked manually.`,
      } satisfies VerificationInfo,
      { status: 200 },
    );
  }

  const json = await upstream.json().catch(() => null);
  const result = json?.result;
  const verified: boolean = Boolean(result?.verified);
  const username: string | null = result?.player?.username ?? result?.official_response?.username ?? null;

  globalCount += 1;

  const info: VerificationInfo = {
    verified,
    retryable: false,
    officialUsername: verified ? username : null,
    checkedAt: new Date().toISOString(),
    message: verified
      ? null
      : (typeof result?.message === "string" && result.message) ||
        "No BGMI account found for this UID.",
  };

  if (verified) {
    cache.set(uid, { info, expires: Date.now() + CACHE_TTL_MS });
  }

  return NextResponse.json(info);
}
