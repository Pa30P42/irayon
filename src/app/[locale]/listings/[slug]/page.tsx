import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { findListingBySlug, mockListings } from '@/data/mock-listings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice, pickLocalized } from '@/lib/utils';
import type { Locale } from '@/i18n/routing';

type ListingDetailProps = {
  params: Promise<{ locale: Locale; slug: string }>;
};

export function generateStaticParams() {
  return mockListings.flatMap((listing) =>
    (['az', 'ru', 'en'] as Locale[]).map((locale) => ({ locale, slug: listing.slug })),
  );
}

export async function generateMetadata({ params }: ListingDetailProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const listing = findListingBySlug(slug);
  if (!listing) return { title: 'Not found' };
  return {
    title: pickLocalized(listing.title, locale),
    description: pickLocalized(listing.description, locale),
  };
}

export default async function ListingDetailPage({ params }: ListingDetailProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const listing = findListingBySlug(slug);
  if (!listing) notFound();

  const t = await getTranslations('listings');
  const tCat = await getTranslations('categories');
  const tCommon = await getTranslations('common');

  const title = pickLocalized(listing.title, locale);
  const description = pickLocalized(listing.description, locale);

  return (
    <article className="container-wide py-10">
      <header className="mb-6">
        <Badge>{tCat(listing.category)}</Badge>
        <h1 className="text-3xl md:text-4xl font-semibold mt-3">{title}</h1>
        <p className="text-foreground-muted mt-2">{listing.location.address}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        {listing.images.slice(0, 4).map((src, idx) => (
          <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-accent">
            <Image
              src={src}
              alt={`${title} ${idx + 1}`}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
              priority={idx === 0}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <p className="text-base leading-relaxed">{description}</p>

          <div className="flex flex-wrap gap-4 text-sm text-foreground-muted">
            <span>
              {listing.capacity} {t('guests')}
            </span>
            <span>
              {listing.bedrooms} {t('bedrooms')}
            </span>
            <span>
              ★ {listing.rating} · {listing.reviewCount} {t('reviews')}
            </span>
          </div>

          <section>
            <h2 className="text-xl font-semibold mb-3">{t('amenities')}</h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {listing.amenities.map((a) => (
                <li key={a} className="text-foreground-muted capitalize">
                  · {a}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="border border-border rounded-xl p-6 h-fit sticky top-6 bg-background">
          <div className="text-2xl font-semibold">
            {formatPrice(listing.price, locale)} {tCommon('currency')}
            <span className="text-sm font-normal text-foreground-muted">
              {' '}
              / {tCommon('perNight')}
            </span>
          </div>
          <Button className="w-full mt-4" size="lg">
            {t('bookNow')}
          </Button>
        </aside>
      </div>
    </article>
  );
}
