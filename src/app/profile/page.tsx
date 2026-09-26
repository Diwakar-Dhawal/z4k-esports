import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/profile";
import { ProfileForm } from "@/app/dashboard/profile-form";
import { Badge, Card } from "@/components/ui";
import { MemberEmblem } from "@/components/esports-art";
import { fmtDate, ROLE_LABELS } from "@/lib/tournament-utils";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/profile");

  return (
    <div className="z4k-container max-w-3xl py-10">
      <div className="mb-8 flex items-center gap-5">
        <MemberEmblem
          name={profile.full_name ?? profile.email}
          photoUrl={profile.avatar_url}
          size={88}
        />
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wide text-white">
            {profile.full_name ?? "Player"}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
            <span>{profile.email}</span>
            <Badge tone={profile.role === "admin" ? "red" : profile.role === "manager" ? "blue" : "gray"}>
              {ROLE_LABELS[profile.role]}
            </Badge>
          </div>
          {profile.created_at ? (
            <p className="mt-0.5 text-xs text-zinc-500">
              Squadding up since {fmtDate(profile.created_at)}
            </p>
          ) : null}
        </div>
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-white">
          Edit profile
        </h2>
        <ProfileForm
          initialName={profile.full_name ?? ""}
          initialWhatsapp={profile.whatsapp ?? ""}
        />
      </Card>

      <p className="mt-4 text-sm text-zinc-500">
        Managing teams and registrations?{" "}
        <Link href="/dashboard" className="text-red-400 hover:text-red-300">
          Go to your dashboard →
        </Link>
      </p>
    </div>
  );
}
