import { useTranslations } from 'next-intl';
import { IconMapPin } from '@tabler/icons-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

const MAP_PREVIEW =
  'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=70';

export function MapTeaser() {
  const t = useTranslations('home.map');

  return (
    <section className="container-wide py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-accent rounded-2xl overflow-hidden">
        <div className="p-8 md:p-12">
          <div className="inline-flex items-center gap-2 text-primary mb-4">
            <IconMapPin size={20} />
            <span className="text-sm font-medium uppercase tracking-wide">Map view</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold">{t('title')}</h2>
          <p className="mt-3 text-foreground-muted max-w-md">{t('subtitle')}</p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/listings?view=map">{t('cta')}</Link>
          </Button>
        </div>
        <div
          className="relative h-64 lg:h-80 bg-cover bg-center"
          style={{ backgroundImage: `url(${MAP_PREVIEW})` }}
          role="img"
          aria-label={t('title')}
        >
          <div className="absolute inset-0 bg-linear-to-l from-transparent to-accent/30" />
        </div>
      </div>
    </section>
  );
}
