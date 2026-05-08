'use client';

import { Link } from '@/i18n/navigation';
import { formatPrice, pickLocalized } from '@/lib/utils';
import type { Listing, Locale } from '@/types';
import { IconStarFilled } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { memo } from 'react';

type Props = {
  listing: Listing;
  locale: Locale;
  isSelected: boolean;
  isHovered: boolean;
  onMouseEnter: (id: string) => void;
  onMouseLeave: () => void;
};

function ListingsMapRowImpl({
  listing,
  locale,
  isSelected,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}: Props) {
  const t = useTranslations('listings');
  const tCommon = useTranslations('common');
  const title = pickLocalized(listing.title, locale);
  const cover = listing.images[0];
  const regionName = pickLocalized(listing.regionName, locale);

  const stateClass = isSelected
    ? 'bg-accent/70'
    : isHovered
      ? 'bg-accent/40'
      : 'bg-background hover:bg-accent/30';

  return (
    <li
      data-listing-id={listing.id}
      aria-current={isSelected || undefined}
      onMouseEnter={() => onMouseEnter(listing.id)}
      onMouseLeave={onMouseLeave}
      className={`${stateClass} transition-colors`}
    >
      <Link
        href={`/listings/${listing.slug}`}
        aria-label={title}
        className="focus-visible:ring-primary block w-full p-3 focus-visible:ring-2 focus-visible:outline-none"
      >
        <div className="flex gap-3">
          <div className="bg-accent relative h-24 w-32 shrink-0 overflow-hidden rounded-lg">
            {cover ? (
              <Image src={cover} alt={title} fill sizes="128px" className="object-cover" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 text-sm font-medium">{title}</h3>
              <div
                className="flex shrink-0 items-center gap-0.5 text-xs"
                aria-label={t('rating')}
              >
                <IconStarFilled size={12} aria-hidden />
                <span>{listing.rating.toFixed(1)}</span>
              </div>
            </div>
            <p className="text-foreground-muted mt-0.5 line-clamp-1 text-xs">{regionName}</p>
            <p className="mt-2 text-sm">
              <span className="font-semibold">
                {formatPrice(listing.price, locale)} {tCommon('currency')}
              </span>
              <span className="text-foreground-muted text-xs"> / {tCommon('perNight')}</span>
            </p>
          </div>
        </div>
      </Link>
    </li>
  );
}

export const ListingsMapRow = memo(ListingsMapRowImpl);
