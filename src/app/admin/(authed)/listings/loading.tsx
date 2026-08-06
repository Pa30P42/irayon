/**
 * Route-level skeleton for /admin/listings — paints instantly on navigation
 * instead of a blank screen while the client list boots and fetches.
 */
export default function AdminListingsLoading() {
  return (
    <div aria-busy>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="bg-accent h-7 w-40 animate-pulse rounded" />
          <div className="bg-accent h-4 w-24 animate-pulse rounded" />
        </div>
        <div className="bg-accent h-9 w-24 animate-pulse rounded-md" />
      </div>
      <ul className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <li
            key={`skeleton-${i}`}
            className="border-border bg-background flex animate-pulse items-center gap-3 rounded-2xl border p-3 shadow-sm"
          >
            <div className="bg-accent h-24 w-24 shrink-0 rounded-md sm:h-28 sm:w-32" />
            <div className="flex-1 space-y-2">
              <div className="bg-accent h-4 w-2/3 rounded" />
              <div className="bg-accent h-3 w-1/2 rounded" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
