import { ListingGridSkeleton } from '@/components/listings/listing-card-skeleton';

export default function RegionLoading() {
  return (
    <section className="container-wide py-12">
      <div className="bg-accent mb-2 h-4 w-32 animate-pulse rounded" />
      <div className="bg-accent mb-3 h-9 w-3/4 animate-pulse rounded" />
      <div className="bg-accent mb-8 h-4 w-2/3 animate-pulse rounded" />
      <ListingGridSkeleton count={6} />
    </section>
  );
}
