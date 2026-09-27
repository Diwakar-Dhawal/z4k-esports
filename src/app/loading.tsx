/**
 * Global route-loading UI. Shown by Next.js while a server segment re-renders
 * (navigation or query-param changes), so slow DB round-trips never feel dead.
 */
export default function Loading() {
  return (
    <div
      className="flex min-h-[70vh] w-full items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-red-500" />
        <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-500">
          Loading
        </span>
      </div>
    </div>
  );
}
