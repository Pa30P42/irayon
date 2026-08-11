import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/typography';
import { Link } from '@/i18n/navigation';
import { countHostBookingsByStatus } from '@/lib/api/bookings-service';
import { requireHostPage } from '@/lib/auth-page-guards';
import { prisma } from '@/lib/prisma';
import { $Enums } from '@prisma/client';
import { getTranslations } from 'next-intl/server';

type PageProps = { params: Promise<{ locale: string }> };

/**
 * Host dashboard. One `groupBy` for all four counters rather than four
 * `count()` round-trips — the runtime pool is `connection_limit=5` and this
 * page renders on every visit to the cabinet.
 */
async function readCounts(hostId: string) {
  const rows = await prisma.listing.groupBy({
    by: ['moderationStatus'],
    where: { hostId },
    _count: { _all: true },
  });
  const byStatus = new Map(rows.map((r) => [r.moderationStatus, r._count._all]));
  const published = await prisma.listing.count({
    where: {
      hostId,
      status: $Enums.ListingStatus.PUBLISHED,
      moderationStatus: $Enums.ModerationStatus.APPROVED,
    },
  });
  return {
    total: rows.reduce((sum, r) => sum + r._count._all, 0),
    pending: byStatus.get($Enums.ModerationStatus.PENDING) ?? 0,
    rejected: byStatus.get($Enums.ModerationStatus.REJECTED) ?? 0,
    published,
  };
}

export default async function HostDashboardPage({ params }: PageProps) {
  const { locale } = await params;
  const user = await requireHostPage({ locale });
  const [t, tBookings, counts, bookingCounts] = await Promise.all([
    getTranslations({ locale, namespace: 'host.dashboard' }),
    getTranslations({ locale, namespace: 'host.bookings' }),
    readCounts(user.id),
    countHostBookingsByStatus(user.id),
  ]);

  const tiles = [
    { label: t('totalListings'), value: counts.total },
    { label: t('pendingReview'), value: counts.pending },
    { label: t('published'), value: counts.published },
    { label: t('rejected'), value: counts.rejected },
    // Booking counters sit alongside the listing ones: a host opening the
    // cabinet wants "does anyone want my place" before "is my listing live".
    { label: tBookings('pending'), value: bookingCounts.pending ?? 0 },
    { label: tBookings('upcoming'), value: bookingCounts.accepted ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Heading as="h1" level="page">
          {t('title')}
        </Heading>
        <p className="text-foreground-muted text-sm">{t('subtitle')}</p>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <div key={tile.label} className="border-border rounded-xl border p-4">
            <dt className="text-foreground-muted text-xs">{tile.label}</dt>
            <dd className="text-2xl font-semibold">{tile.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/host/bookings">{tBookings('title')}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/host/listings">{t('totalListings')}</Link>
        </Button>
      </div>
    </div>
  );
}
