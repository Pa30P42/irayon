import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { IconMapPin } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

const MAP_PREVIEW =
  'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=70';

export function MapTeaser() {
  const t = useTranslations('home.map');

  return (
    <section className="container-wide py-12">
      <div className="bg-accent grid grid-cols-1 items-center gap-8 overflow-hidden rounded-2xl lg:grid-cols-2">
        <div className="p-8 md:p-12">
          <div className="text-primary mb-4 inline-flex items-center gap-2">
            <IconMapPin size={20} />
            <span className="text-sm font-medium tracking-wide uppercase">Map view</span>
          </div>
          <h2 className="text-2xl font-semibold md:text-3xl">{t('title')}</h2>
          <p className="text-foreground-muted mt-3 max-w-md">{t('subtitle')}</p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/listings?view=map">{t('cta')}</Link>
          </Button>
        </div>
        <div
          className="relative h-64 bg-cover bg-center lg:h-80"
          style={{ backgroundImage: `url(${MAP_PREVIEW})` }}
          role="img"
          aria-label={t('title')}
        >
          <div className="to-accent/30 absolute inset-0 bg-linear-to-l from-transparent" />
        </div>
      </div>
    </section>
  );
}
