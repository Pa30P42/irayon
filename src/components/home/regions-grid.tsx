import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { FEATURED_REGIONS } from '@/lib/constants';
import type { Region } from '@/types';

const REGION_IMAGES: Record<Region, string> = {
  gabala: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=70',
  sheki: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=70',
  guba: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=70',
  lankaran: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=70',
  gusar: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?auto=format&fit=crop&w=800&q=70',
  gakh: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=800&q=70',
  ismayilli: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=70',
  goychay: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=70',
  absheron: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=70',
  lerik: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=800&q=70',
};

export function RegionsGrid() {
  const t = useTranslations('home.regions');
  const tRegions = useTranslations('regions');

  return (
    <section className="container-wide py-12">
      <header className="mb-8">
        <h2 className="text-2xl md:text-3xl font-semibold">{t('title')}</h2>
        <p className="text-foreground-muted mt-2">{t('subtitle')}</p>
      </header>
      <ul className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {FEATURED_REGIONS.map((region) => (
          <li key={region}>
            <Link
              href={`/listings?region=${region}`}
              className="group relative block aspect-4/3 rounded-xl overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={tRegions(region)}
            >
              <Image
                src={REGION_IMAGES[region]}
                alt=""
                fill
                sizes="(min-width: 768px) 33vw, 50vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
              <span className="absolute bottom-3 left-4 right-4 text-white font-medium text-lg">
                {tRegions(region)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
