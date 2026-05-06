import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { findListingBySlug, mockListings } from '@/data/mock-listings';
import type { Locale } from '@/i18n/routing';
import { formatPrice, pickLocalized } from '@/lib/utils';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Image from 'next/image';
import { notFound } from 'next/navigation';

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
        <h1 className="mt-3 text-3xl font-semibold md:text-4xl">{title}</h1>
        <p className="text-foreground-muted mt-2">{listing.location.address}</p>
      </header>

      <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2">
        {listing.images.slice(0, 4).map((src, idx) => (
          <div key={src} className="bg-accent relative aspect-[4/3] overflow-hidden rounded-lg">
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <p className="text-base leading-relaxed">{description}</p>

          <div className="text-foreground-muted flex flex-wrap gap-4 text-sm">
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
            <h2 className="mb-3 text-xl font-semibold">{t('amenities')}</h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {listing.amenities.map((a) => (
                <li key={a} className="text-foreground-muted capitalize">
                  · {a}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="border-border bg-background sticky top-6 h-fit rounded-xl border p-6">
          <div className="text-2xl font-semibold">
            {formatPrice(listing.price, locale)} {tCommon('currency')}
            <span className="text-foreground-muted text-sm font-normal">
              {' '}
              / {tCommon('perNight')}
            </span>
          </div>
          <Button className="mt-4 w-full" size="lg">
            {t('bookNow')}
          </Button>
        </aside>
      </div>
    </article>
  );
}
