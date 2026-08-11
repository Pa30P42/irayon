import { ModerationBadge } from '@/components/host/host-listing-badges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Heading } from '@/components/ui/typography';
import { Link } from '@/i18n/navigation';
import { parseLocalized } from '@/lib/api/localized-text';
import { requireHostPage } from '@/lib/auth-page-guards';
import { prisma } from '@/lib/prisma';
import type { Route } from 'next';
import { getTranslations } from 'next-intl/server';

type PageProps = { params: Promise<{ locale: string }> };

/**
 * A server component rather than a client hook: the row needs
 * `moderationStatus` and `pendingChanges`, which are host-only concepts. Adding
 * them to `ListingCardDto` would push moderation internals into the PUBLIC
 * `/api/listings` payload for the sake of one private table.
 */
export default async function HostListingsPage({ params }: PageProps) {
  const { locale } = await params;
  const user = await requireHostPage({ locale });
  const t = await getTranslations({ locale, namespace: 'host.listings' });

  const listings = await prisma.listing.findMany({
    where: { hostId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      moderationStatus: true,
      moderationNote: true,
      pendingChanges: true,
      price: true,
    },
  });

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <Heading as="h1" level="page">
          {t('title')}
        </Heading>
        <Button asChild size="sm">
          <Link href="/host/listings/new">{t('create')}</Link>
        </Button>
      </header>

      {listings.length === 0 ? (
        <EmptyState
          title={t('empty')}
          description={t('emptyDescription')}
          action={
            <Button asChild>
              <Link href="/host/listings/new">{t('create')}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {listings.map((listing) => {
            const title = parseLocalized(listing.title);
            return (
              <li
                key={listing.id}
                className="border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium">
                    {title[locale as 'az' | 'ru' | 'en'] || title.en}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <ModerationBadge
                      moderationStatus={listing.moderationStatus}
                      hasPendingChanges={listing.pendingChanges !== null}
                    />
                    <Badge variant="outline">{listing.status.toLowerCase()}</Badge>
                    <span className="text-foreground-muted text-xs">{listing.price} AZN</span>
                  </div>
                  {listing.moderationStatus === 'REJECTED' && listing.moderationNote ? (
                    <p className="text-foreground-muted text-xs">
                      {/* Plain text node — a moderator's note is untrusted input
                          and is never rendered as HTML. */}
                      {listing.moderationNote}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/host/listings/${listing.id}/edit` as Route}>{t('edit')}</Link>
                  </Button>
                  {listing.moderationStatus === 'APPROVED' && listing.status === 'PUBLISHED' ? (
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/listings/${listing.slug}` as Route}>{t('view')}</Link>
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
