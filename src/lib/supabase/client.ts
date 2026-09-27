"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let client: SupabaseClient | undefined;

/** Browser-side Supabase client (singleton). */
export function createClient(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(URL, ANON);
  }
  return client;
}
