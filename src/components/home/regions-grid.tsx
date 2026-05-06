import { Link } from '@/i18n/navigation';
import { FEATURED_REGIONS } from '@/lib/constants';
import type { Region } from '@/types';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

const REGION_IMAGES: Record<Region, string> = {
  gabala:
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=70',
  sheki:
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=70',
  guba: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=70',
  lankaran:
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=70',
  gusar:
    'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?auto=format&fit=crop&w=800&q=70',
  gakh: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=800&q=70',
  ismayilli:
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=70',
  goychay:
    'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=70',
  absheron:
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=70',
  lerik:
    'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=800&q=70',
  zagatala:
    'https://images.unsplash.com/photo-1485470733090-0aae1788d5af?auto=format&fit=crop&w=800&q=70',
};

export function RegionsGrid() {
  const t = useTranslations('home.regions');
  const tRegions = useTranslations('regions');

  return (
    <section className="container-wide py-12">
      <header className="mb-8">
        <h2 className="text-2xl font-semibold md:text-3xl">{t('title')}</h2>
        <p className="text-foreground-muted mt-2">{t('subtitle')}</p>
      </header>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
        {FEATURED_REGIONS.map((region) => (
          <li key={region}>
            <Link
              href={`/listings?region=${region}`}
              className="group focus-visible:ring-primary relative block aspect-4/3 overflow-hidden rounded-xl focus-visible:ring-2 focus-visible:outline-none"
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
              <span className="absolute right-4 bottom-3 left-4 text-lg font-medium text-white">
                {tRegions(region)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
