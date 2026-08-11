import { HostBookingList } from '@/components/host/host-booking-list';
import { EmptyState } from '@/components/ui/empty-state';
import { Heading } from '@/components/ui/typography';
import { Link } from '@/i18n/navigation';
import { listHostBookings, type HostBookingFilter } from '@/lib/api/bookings-service';
import { requireHostPage } from '@/lib/auth-page-guards';
import { cn } from '@/lib/utils';
import type { Route } from 'next';
import { getTranslations } from 'next-intl/server';

const FILTERS: HostBookingFilter[] = ['pending', 'upcoming', 'past', 'all'];

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string }>;
};

export default async function HostBookingsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { filter: rawFilter } = await searchParams;
  const user = await requireHostPage({ locale });

  const filter: HostBookingFilter = FILTERS.includes(rawFilter as HostBookingFilter)
    ? (rawFilter as HostBookingFilter)
    : 'pending';

  const [t, bookings] = await Promise.all([
    getTranslations({ locale, namespace: 'host.bookings' }),
    listHostBookings(user.id, filter),
  ]);

  return (
    <div className="space-y-5">
      <Heading as="h1" level="page">
        {t('title')}
      </Heading>

      <nav className="flex flex-wrap gap-2 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/host/bookings?filter=${f}` as Route}
            className={cn(
              'rounded-full px-3 py-1',
              f === filter
                ? 'bg-primary text-white'
                : 'border-border text-foreground-muted hover:text-foreground border',
            )}
          >
            {t(f)}
          </Link>
        ))}
      </nav>

      {bookings.length === 0 ? (
        <EmptyState title={t('empty')} description={t('emptyBody')} />
      ) : (
        <HostBookingList bookings={bookings} />
      )}
    </div>
  );
}
