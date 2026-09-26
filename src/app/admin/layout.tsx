import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile, isStaff } from "@/lib/supabase/profile";
import { Badge } from "@/components/ui";

const ALL_TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/tournaments", label: "Tournaments" },
  { href: "/admin/registrations", label: "Registrations" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/members", label: "Team Page" },
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/users", label: "Users", adminOnly: true },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/admin");
  if (!isStaff(profile)) redirect("/dashboard");

  const tabs = ALL_TABS.filter((t) => !t.adminOnly || profile.role === "admin");

  return (
    <div className="z4k-container py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black uppercase tracking-widest text-white">
            Z4K Control Room
          </h1>
          <Badge tone={profile.role === "admin" ? "red" : "blue"}>{profile.role}</Badge>
        </div>
      </div>
      <nav className="mb-8 flex flex-wrap gap-1 border-b border-zinc-800 pb-3">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="rounded-md px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
