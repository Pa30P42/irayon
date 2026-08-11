import { BookingList } from '@/components/account/booking-list';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Heading } from '@/components/ui/typography';
import { Link } from '@/i18n/navigation';
import { listGuestBookings } from '@/lib/api/bookings-service';
import { requireUserPage } from '@/lib/auth-page-guards';
import { getTranslations } from 'next-intl/server';

type PageProps = { params: Promise<{ locale: string }> };

export default async function AccountBookingsPage({ params }: PageProps) {
  const { locale } = await params;
  const user = await requireUserPage({ locale });
  const [t, bookings] = await Promise.all([
    getTranslations({ locale, namespace: 'account' }),
    listGuestBookings(user.id),
  ]);

  return (
    <div className="space-y-5">
      <Heading as="h1" level="page">
        {t('bookingsTitle')}
      </Heading>

      {bookings.length === 0 ? (
        <EmptyState
          title={t('bookingsEmpty')}
          description={t('bookingsEmptyBody')}
          action={
            <Button asChild>
              <Link href="/listings">{t('browse')}</Link>
            </Button>
          }
        />
      ) : (
        <BookingList bookings={bookings} />
      )}
    </div>
  );
}
