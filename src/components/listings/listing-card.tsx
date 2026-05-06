import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { IconStarFilled } from '@tabler/icons-react';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { FavoriteButton } from './favorite-button';
import { AmenityIcon } from './amenity-icon';
import { formatPrice, pickLocalized } from '@/lib/utils';
import { getListingBadge, pickTopAmenities } from '@/lib/listing-card-helpers';
import type { Listing, Locale } from '@/types';

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
        className="block rounded-xl overflow-hidden bg-background border border-border transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="relative aspect-4/3 overflow-hidden bg-accent">
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
            <h3 className="font-medium text-base line-clamp-2">{title}</h3>
            <div className="flex items-center gap-1 text-sm shrink-0" aria-label={t('rating')}>
              <IconStarFilled size={14} aria-hidden />
              <span>{listing.rating.toFixed(1)}</span>
            </div>
          </div>
          <p className="text-sm text-foreground-muted mt-1">{regionName}</p>
          {topAmenities.length > 0 ? (
            <ul className="mt-3 flex items-center gap-3 text-foreground-muted" aria-label={t('amenities')}>
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
            <span className="text-foreground-muted text-sm">
              {' '}
              / {tCommon('perNight')}
            </span>
          </p>
        </div>
      </Link>
      <FavoriteButton />
    </article>
  );
}
