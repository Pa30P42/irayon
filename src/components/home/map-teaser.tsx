import { ListingsMapLoader } from '@/components/listings/map/listings-map-loader';
import { LazyMount } from '@/components/shared/lazy-mount';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { Listing, Locale } from '@/types';
import { IconMapPin } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

type MapTeaserProps = {
  listings: Listing[];
  locale: Locale;
};

export function MapTeaser({ listings, locale }: MapTeaserProps) {
  const t = useTranslations('home.map');

  return (
    <section className="container-wide py-12">
      <div className="bg-accent grid grid-cols-1 items-stretch gap-0 overflow-hidden rounded-2xl lg:grid-cols-2">
        <div className="flex flex-col justify-center p-8 md:p-12">
          <div className="text-primary mb-4 inline-flex items-center gap-2">
            <IconMapPin size={20} />
            <span className="text-sm font-medium tracking-wide uppercase">{t('label')}</span>
          </div>
          <h2 className="text-2xl font-semibold md:text-3xl">{t('title')}</h2>
          <p className="text-foreground-muted mt-3 max-w-md">{t('subtitle')}</p>
          <p className="text-foreground-muted mt-2 text-sm">
            {t('count', { count: listings.length })}
          </p>
          <div className="mt-6">
            <Button asChild size="lg">
              <Link href="/listings?view=map">{t('cta')}</Link>
            </Button>
          </div>
        </div>
        <LazyMount
          className="relative h-72 lg:h-104"
          fallback={<div className="bg-accent h-full w-full animate-pulse" aria-hidden />}
        >
          <ListingsMapLoader
            listings={listings}
            locale={locale}
            scrollWheelZoom={false}
            cluster
            showPopups
          />
          <div
            className="from-accent/40 pointer-events-none absolute inset-y-0 left-0 hidden w-12 bg-linear-to-r to-transparent lg:block"
            aria-hidden
          />
        </LazyMount>
      </div>
    </section>
  );
}
