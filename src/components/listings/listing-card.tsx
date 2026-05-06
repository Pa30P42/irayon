import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import { getListingBadge, pickTopAmenities } from '@/lib/listing-card-helpers';
import { formatPrice, pickLocalized } from '@/lib/utils';
import type { Listing, Locale } from '@/types';
import { IconStarFilled } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { AmenityIcon } from './amenity-icon';
import { FavoriteButton } from './favorite-button';

type ListingCardProps = {
  listing: Listing;
  locale: Locale;
  priority?: boolean;
};

export function ListingCard({ listing, locale, priority = false }: ListingCardProps) {
  const t = useTranslations('listings');
  const tCommon = useTranslations('common');
  const tRegions = useTranslations('regions');

  const title = pickLocalized(listing.title, locale);
  const cover = listing.images[0];
  const badge = getListingBadge(listing);
  const topAmenities = pickTopAmenities(listing.amenities, 3);
  const regionName = tRegions(listing.region);

  return (
    <article className="group relative">
      <Link
        href={`/listings/${listing.slug}`}
        aria-label={title}
        className="bg-background border-border focus-visible:ring-primary block overflow-hidden rounded-xl border transition-shadow hover:shadow-lg focus-visible:ring-2 focus-visible:outline-none"
      >
        <div className="bg-accent relative aspect-4/3 overflow-hidden">
          {cover ? (
            <Image
              src={cover}
              alt={title}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              priority={priority}
            />
          ) : null}
          {badge ? (
            <Badge className="absolute top-3 left-3" variant="solid">
              {t(badge)}
            </Badge>
          ) : null}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-base font-medium">{title}</h3>
            <div className="flex shrink-0 items-center gap-1 text-sm" aria-label={t('rating')}>
              <IconStarFilled size={14} aria-hidden />
              <span>{listing.rating.toFixed(1)}</span>
            </div>
          </div>
          <p className="text-foreground-muted mt-1 text-sm">{regionName}</p>
          {topAmenities.length > 0 ? (
            <ul
              className="text-foreground-muted mt-3 flex items-center gap-3"
              aria-label={t('amenities')}
            >
              {topAmenities.map((a) => (
                <li key={a}>
                  <AmenityIcon amenity={a} />
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3 text-base">
            <span className="font-semibold">
              {formatPrice(listing.price, locale)} {tCommon('currency')}
            </span>
            <span className="text-foreground-muted text-sm"> / {tCommon('perNight')}</span>
          </p>
        </div>
      </Link>
      <FavoriteButton />
    </article>
  );
}
