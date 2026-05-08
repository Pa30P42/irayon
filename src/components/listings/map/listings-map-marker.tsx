'use client';

import { Link } from '@/i18n/navigation';
import { formatPrice, pickLocalized } from '@/lib/utils';
import type { Listing, Locale } from '@/types';
import type L from 'leaflet';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { memo, useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';

type ListingMapMarkerProps = {
  listing: Listing;
  locale: Locale;
  isSelected: boolean;
  iconUnselected: L.DivIcon;
  iconSelected: L.DivIcon;
  showPopup: boolean;
  onSelect?: (id: string) => void;
};

function ListingMapMarkerImpl({
  listing,
  locale,
  isSelected,
  iconUnselected,
  iconSelected,
  showPopup,
  onSelect,
}: ListingMapMarkerProps) {
  const t = useTranslations('listings');
  const tCommon = useTranslations('common');

  const eventHandlers = useMemo(
    () => ({ click: () => onSelect?.(listing.id) }),
    [listing.id, onSelect],
  );

  const title = pickLocalized(listing.title, locale);
  const regionName = pickLocalized(listing.regionName, locale);
  const cover = listing.images[0];

  return (
    <Marker
      position={[listing.location.lat, listing.location.lng]}
      icon={isSelected ? iconSelected : iconUnselected}
      eventHandlers={eventHandlers}
    >
      {showPopup ? (
        <Popup className="irayon-popup" closeButton={false} maxWidth={260} minWidth={240}>
          <Link href={`/listings/${listing.slug}`} className="block" aria-label={title}>
            {cover ? (
              <div className="bg-accent relative aspect-4/3 w-full overflow-hidden rounded-t-lg">
                <Image src={cover} alt={title} fill sizes="240px" className="object-cover" />
              </div>
            ) : null}
            <div className="p-3">
              <p className="text-foreground line-clamp-1 text-sm font-medium">{title}</p>
              <p className="text-foreground-muted mt-0.5 line-clamp-1 text-xs">{regionName}</p>
              <p className="text-foreground mt-2 text-sm font-semibold">
                {formatPrice(listing.price, locale)} {tCommon('currency')}
                <span className="text-foreground-muted ml-1 text-xs font-normal">
                  / {tCommon('perNight')}
                </span>
              </p>
              <span className="text-primary mt-2 inline-block text-xs font-medium">
                {t('bookNow')} →
              </span>
            </div>
          </Link>
        </Popup>
      ) : null}
    </Marker>
  );
}

export const ListingMapMarker = memo(ListingMapMarkerImpl);
