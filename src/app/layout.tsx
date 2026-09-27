import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { getProfile } from "@/lib/supabase/profile";
import { SiteSidebar } from "@/components/site-sidebar";
import { SiteFooter } from "@/components/site-footer";
import { HashScroll } from "@/components/hash-scroll";
import { NavLoader } from "@/components/nav-loader";

export const metadata: Metadata = {
  title: {
    default: "Z4K Esports — Forge Your Legend",
    template: "%s · Z4K Esports",
  },
  description:
    "Z4K Esports — competitive gaming organization. Tournaments, rosters and grind.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <SiteSidebar profile={profile} />
        <Suspense fallback={null}>
          <HashScroll />
          <NavLoader />
        </Suspense>
        <div className="md:pl-60">
          <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
