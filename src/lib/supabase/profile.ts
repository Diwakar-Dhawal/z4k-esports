import { cache } from "react";
import { createClient } from "./server";

export type Role = "admin" | "manager" | "user";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
  whatsapp: string | null;
  created_at?: string;
}

/** Current user profile (per-request cached). */
export const getProfile = cache(async (): Promise<Profile | null> => {
  // The public shell should still render when Supabase variables are not present
  // in a preview environment; authenticated data simply remains unavailable.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, email, full_name, avatar_url, role, whatsapp")
    .eq("id", claims.sub)
    .single();

  return (profile as Profile | null) ?? null;
});

/** Current user id (per-request cached). */
export const getUserId = cache(async (): Promise<string | null> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
});

export function isStaff(profile: Profile | null): boolean {
  return profile?.role === "admin" || profile?.role === "manager";
}
