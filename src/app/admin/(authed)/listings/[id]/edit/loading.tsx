export default function EditListingLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-2">
        <div className="bg-accent h-7 w-40 animate-pulse rounded-md sm:h-8" />
        <div className="bg-accent h-4 w-3/4 animate-pulse rounded" />
      </header>
      <div className="space-y-5" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <section
            key={i}
            className="border-border bg-background space-y-4 rounded-2xl border p-5 shadow-sm sm:p-6"
          >
            <div className="bg-accent h-5 w-32 animate-pulse rounded" />
            <div className="bg-accent h-4 w-2/3 animate-pulse rounded" />
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-accent h-10 animate-pulse rounded-md" />
              <div className="bg-accent h-10 animate-pulse rounded-md" />
            </div>
            <div className="bg-accent h-10 animate-pulse rounded-md" />
          </section>
        ))}
      </div>
    </div>
  );
}
