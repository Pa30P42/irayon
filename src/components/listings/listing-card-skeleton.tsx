import { cn } from '@/lib/utils';

type ListingCardSkeletonProps = {
  className?: string;
};

/** Matches the dimensions of <ListingCard> so the layout doesn't jump on hydration. */
export function ListingCardSkeleton({ className }: ListingCardSkeletonProps) {
  return (
    <div
      className={cn(
        'border-border bg-background block overflow-hidden rounded-xl border',
        className,
      )}
      aria-hidden
    >
      <div className="bg-accent aspect-4/3 animate-pulse" />
      <div className="space-y-3 p-4">
        <div className="bg-accent h-4 w-3/4 animate-pulse rounded" />
        <div className="bg-accent h-3 w-1/2 animate-pulse rounded" />
        <div className="flex gap-3 pt-1">
          <div className="bg-accent h-4 w-4 animate-pulse rounded" />
          <div className="bg-accent h-4 w-4 animate-pulse rounded" />
          <div className="bg-accent h-4 w-4 animate-pulse rounded" />
        </div>
        <div className="bg-accent h-5 w-1/3 animate-pulse rounded" />
      </div>
    </div>
  );
}

type ListingGridSkeletonProps = {
  count?: number;
  className?: string;
};

export function ListingGridSkeleton({ count = 6, className }: ListingGridSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}
