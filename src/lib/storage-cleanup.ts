import { createClient } from "@/lib/supabase/client";

/**
 * Storage hygiene for the free tier: files in Supabase Storage are NOT removed
 * automatically when the DB rows referencing them disappear. Every delete in
 * the admin UI routes through here first so space is actually reclaimed.
 * External URLs (e.g. Google avatars) are ignored safely.
 */

const BUCKETS = ["site", "tournament-media"] as const;
type Bucket = (typeof BUCKETS)[number];

export function extractStorageRef(
  url: string | null | undefined,
): { bucket: Bucket; path: string } | null {
  if (!url) return null;
  for (const bucket of BUCKETS) {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const path = decodeURIComponent(url.slice(idx + marker.length).split("?")[0]);
      if (path) return { bucket, path };
    }
  }
  return null;
}

/** Deletes the stored files behind the given URLs (our buckets only). */
export async function deleteStoredImages(urls: Array<string | null | undefined>) {
  const refs = urls
    .map((u) => extractStorageRef(u))
    .filter((r): r is { bucket: Bucket; path: string } => r !== null);
  if (refs.length === 0) return;

  const supabase = createClient();
  const byBucket = new Map<Bucket, string[]>();
  for (const ref of refs) {
    byBucket.set(ref.bucket, [...(byBucket.get(ref.bucket) ?? []), ref.path]);
  }
  for (const [bucket, paths] of byBucket) {
    await supabase.storage.from(bucket).remove(paths);
  }
}
