import { ListingGridSkeleton } from '@/components/listings/listing-card-skeleton';

export default function ListingsLoading() {
  return (
    <section className="container-wide py-12">
      <div className="bg-accent mb-3 h-9 w-1/2 animate-pulse rounded-md" />
      <div className="bg-accent mb-8 h-4 w-2/3 animate-pulse rounded-md" />
      <ListingGridSkeleton count={9} />
    </section>
  );
}
