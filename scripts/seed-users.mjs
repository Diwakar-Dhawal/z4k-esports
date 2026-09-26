// Creates the three demo accounts (one per role) via Supabase auth REST.
// Safe to re-run: existing emails are skipped. Uses only the public anon key.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [
      l.slice(0, l.indexOf("=")).trim(),
      l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, ""),
    ]),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY in .env.local");
  process.exit(1);
}

const accounts = [
  { email: "z4k.owner.demo@gmail.com", password: "Z4kDemo!2026", full_name: "Z4K Owner (Admin)" },
  { email: "z4k.manager.demo@gmail.com", password: "Z4kDemo!2026", full_name: "Sana Nova (Manager)" },
  { email: "z4k.player.demo@gmail.com", password: "Z4kDemo!2026", full_name: "Rohit Blaze (Player)" },
];

for (const acc of accounts) {
  const res = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: acc.email,
      password: acc.password,
      data: { full_name: acc.full_name },
    }),
  });
  const body = await res.json().catch(() => ({}));

  if (res.status === 422 && /already|registered/i.test(body.msg ?? body.error_description ?? "")) {
    console.log(`= ${acc.email}: already exists, skipped`);
  } else if (!res.ok) {
    console.error(`! ${acc.email}: HTTP ${res.status} — ${body.msg ?? body.error_description ?? body.error ?? "unknown"}`);
  } else if (body.access_token) {
    console.log(`+ ${acc.email}: created, session active (no email confirmation required)`);
  } else {
    console.log(`~ ${acc.email}: created but EMAIL CONFIRMATION required before sign-in`);
  }
}
