/**
 * Route-level skeleton for /admin/regions — paints instantly on navigation
 * instead of a blank screen while the client list boots and fetches.
 */
export default function AdminRegionsLoading() {
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
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={`skeleton-${i}`}
            className="border-border bg-background animate-pulse rounded-2xl border p-4 shadow-sm"
          >
            <div className="space-y-2">
              <div className="bg-accent h-4 w-1/3 rounded" />
              <div className="bg-accent h-3 w-1/4 rounded" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
