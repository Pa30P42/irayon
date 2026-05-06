import type { Listing } from '@/types';
import { IconMapPin } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

type ListingLocationProps = {
  listing: Listing;
};

/**
 * Visual placeholder for a static map preview. Plug in a real tile provider
 * (Mapbox Static API or Google Static Maps) later — this just provides the
 * visual slot and the address text the spec asked for.
 */
export function ListingLocation({ listing }: ListingLocationProps) {
  const t = useTranslations('detail.location');
  const { address, lat, lng } = listing.location;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{t('title')}</h2>

      <div
        className="bg-accent border-border relative grid aspect-16/9 w-full place-items-center overflow-hidden rounded-2xl border"
        role="img"
        aria-label={t('mapPlaceholder')}
      >
        <div className="bg-background flex flex-col items-center gap-2 rounded-xl px-6 py-4 shadow">
          <IconMapPin size={28} className="text-primary" aria-hidden />
          <p className="text-sm font-medium">{address}</p>
          <p className="text-foreground-muted text-xs tabular-nums">
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </p>
        </div>
      </div>
    </section>
  );
}
