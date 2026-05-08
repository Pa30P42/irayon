export default function ListingDetailLoading() {
  return (
    <article className="container-wide animate-pulse py-10">
      <div className="bg-accent mb-2 h-4 w-24 rounded" />
      <div className="bg-accent mb-6 h-9 w-3/4 rounded" />
      <div className="bg-accent mb-8 aspect-2/1 w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="bg-accent h-4 w-2/3 rounded" />
          <div className="bg-accent h-4 w-3/4 rounded" />
          <div className="bg-accent h-4 w-1/2 rounded" />
          <div className="bg-accent h-32 rounded" />
        </div>
        <div className="bg-accent h-72 rounded-2xl" />
      </div>
    </article>
  );
}
