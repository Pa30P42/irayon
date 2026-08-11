import { ListingGrid } from '@/components/listings/listing-grid';
import { EmptyState } from '@/components/ui/empty-state';
import { Heading } from '@/components/ui/typography';
import { LISTING_CARD_SELECT, rowToCardDto } from '@/lib/api/listing-dto';
import { publicListingWhere } from '@/lib/api/listings-service';
import { prisma } from '@/lib/prisma';
import type { Locale } from '@/types';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

type PageProps = { params: Promise<{ locale: string; id: string }> };

export const metadata: Metadata = {
  // A host profile is a person. Public so guests can judge who they're paying
  // in cash, but not something to accumulate in a search index.
  robots: { index: false, follow: true },
};

/**
 * Public host profile.
 *
 * Exists because settlement happens offline: a guest handing over cash at a
 * gate wants to see that the person on the other end has other listings and has
 * been around a while. Deliberately minimal — name, join date, and their
 * publicly visible listings. No email, no phone, no booking history.
 */
export default async function HostProfilePage({ params }: PageProps) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'hostProfile' });

  const host = await prisma.user.findFirst({
    // A suspended host's profile disappears along with their listings.
    where: { id, suspendedAt: null, becameHostAt: { not: null } },
    select: {
      name: true,
      image: true,
      becameHostAt: true,
      listings: {
        where: publicListingWhere,
        orderBy: { createdAt: 'desc' },
        take: 24,
        select: LISTING_CARD_SELECT,
      },
    },
  });
  if (!host) notFound();

  return (
    <main className="container-wide space-y-6 py-8">
      <header className="space-y-1">
        <p className="text-foreground-muted text-sm">{t('title')}</p>
        <Heading as="h1" level="page">
          {host.name ?? t('title')}
        </Heading>
        {host.becameHostAt ? (
          <p className="text-foreground-muted text-sm">
            {t('memberSince')} {host.becameHostAt.getFullYear()}
          </p>
        ) : null}
      </header>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">{t('listings')}</h2>
        {host.listings.length === 0 ? (
          <EmptyState title={t('noListings')} />
        ) : (
          <ListingGrid listings={host.listings.map(rowToCardDto)} locale={locale as Locale} />
        )}
      </section>
    </main>
  );
}
