import { createClient } from "@/lib/supabase/server";
import { SectionTitle } from "@/components/ui";
import { ContentClient } from "./content-client";
import type { ContentBlock, LandingSlide } from "@/lib/types";

export default async function AdminContentPage() {
  const supabase = await createClient();
  const [blocksRes, slidesRes] = await Promise.all([
    supabase.from("content_blocks").select("*").order("kind").order("sort_order"),
    supabase.from("landing_slides").select("*").order("sort_order"),
  ]);
  return (
    <div>
      <SectionTitle sub="Hero taglines, quotes, page copy and the landing games carousel — all editable from here.">
        Site content
      </SectionTitle>
      <ContentClient
        blocks={(blocksRes.data ?? []) as ContentBlock[]}
        slides={(slidesRes.data ?? []) as LandingSlide[]}
      />
    </div>
  );
}
