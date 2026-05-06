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

type ListingRowProps = {
  listing: Listing;
  locale: Locale;
  priority?: boolean;
};

export function ListingRow({ listing, locale, priority = false }: ListingRowProps) {
  const t = useTranslations('listings');
  const tCommon = useTranslations('common');
  const tRegions = useTranslations('regions');
  const tAmenity = useTranslations('amenity');

  const title = pickLocalized(listing.title, locale);
  const cover = listing.images[0];
  const badge = getListingBadge(listing);
  const topAmenities = pickTopAmenities(listing.amenities, 4);
  const regionName = tRegions(listing.region);

  return (
    <article className="group relative">
      <Link
        href={`/listings/${listing.slug}`}
        aria-label={title}
        className="bg-background border-border focus-visible:ring-primary grid grid-cols-[160px_1fr] overflow-hidden rounded-xl border transition-shadow hover:shadow-lg focus-visible:ring-2 focus-visible:outline-none sm:grid-cols-[260px_1fr]"
      >
        <div className="bg-accent relative aspect-square overflow-hidden sm:aspect-4/3">
          {cover ? (
            <Image
              src={cover}
              alt={title}
              fill
              sizes="(min-width: 640px) 260px, 160px"
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
        <div className="flex flex-col justify-between gap-3 p-4 sm:p-6">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h3 className="line-clamp-2 text-lg font-medium">{title}</h3>
              <div className="flex shrink-0 items-center gap-1 text-sm" aria-label={t('rating')}>
                <IconStarFilled size={14} aria-hidden />
                <span>{listing.rating.toFixed(1)}</span>
                <span className="text-foreground-muted">· {listing.reviewCount}</span>
              </div>
            </div>
            <p className="text-foreground-muted mt-1 text-sm">{regionName}</p>
            {topAmenities.length > 0 ? (
              <ul
                className="text-foreground-muted mt-3 flex flex-wrap items-center gap-x-4 gap-y-2"
                aria-label={t('amenities')}
              >
                {topAmenities.map((a) => (
                  <li key={a} className="flex items-center gap-1.5 text-xs">
                    <AmenityIcon amenity={a} />
                    <span>{tAmenity(a)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <p className="text-base">
            <span className="text-lg font-semibold">
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
