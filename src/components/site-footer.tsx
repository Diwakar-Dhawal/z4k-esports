import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950">
      <div className="z4k-container flex flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-zinc-500 md:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-red-600 text-[10px] font-black text-white">
            Z4K
          </span>
          <span className="font-semibold uppercase tracking-widest text-zinc-300">
            Z4K Esports
          </span>
        </div>
        <nav className="flex gap-4">
          <Link href="/tournaments" className="hover:text-white">Tournaments</Link>
          <Link href="/team" className="hover:text-white">Team</Link>
          <Link href="/login" className="hover:text-white">Sign in</Link>
        </nav>
        <p>© {new Date().getFullYear()} Z4K Esports. Forge your legend.</p>
      </div>
    </footer>
  );
}
