import Image from 'next/image';
import { Star } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { formatPrice, pickLocalized } from '@/lib/utils';
import type { Listing, Locale } from '@/types';

type ListingCardProps = {
  listing: Listing;
  locale: Locale;
  priority?: boolean;
};

export function ListingCard({ listing, locale, priority = false }: ListingCardProps) {
  const title = pickLocalized(listing.title, locale);
  const cover = listing.images[0];

  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group block rounded-xl overflow-hidden bg-background border border-[var(--color-border)] hover:shadow-lg transition-shadow"
    >
      <div className="relative aspect-[4/3] bg-[var(--color-accent)]">
        {cover ? (
          <Image
            src={cover}
            alt={title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            priority={priority}
          />
        ) : null}
        <Badge className="absolute top-3 left-3" variant="solid">
          {listing.category}
        </Badge>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-medium text-base line-clamp-2">{title}</h3>
          <div className="flex items-center gap-1 text-sm">
            <Star className="h-4 w-4 fill-current" aria-hidden />
            <span>{listing.rating.toFixed(1)}</span>
          </div>
        </div>
        <p className="text-sm text-foreground-muted mt-1">{listing.location.address}</p>
        <p className="mt-3 text-base">
          <span className="font-semibold">{formatPrice(listing.price, locale)} AZN</span>
          <span className="text-foreground-muted text-sm"> / night</span>
        </p>
      </div>
    </Link>
  );
}
