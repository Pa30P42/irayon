'use client';

import { OpenThreadButton } from '@/components/messaging/open-thread-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCancelBooking } from '@/hooks/use-create-booking';
import { Link } from '@/i18n/navigation';
import type { BookingDto } from '@/lib/api/booking-dto';
import type { Route } from 'next';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Statuses a guest may still withdraw from. Mirrors `booking-state.ts`. */
const CANCELLABLE = new Set(['pending', 'accepted']);

const badgeVariant = (status: string): 'default' | 'solid' | 'outline' =>
  status === 'accepted' ? 'solid' : status === 'pending' ? 'default' : 'outline';

export function BookingList({ bookings }: { bookings: BookingDto[] }) {
  const t = useTranslations('account');
  const router = useRouter();
  const cancel = useCancelBooking();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onCancel = (booking: BookingDto) => {
    if (busyId) return;
    if (!window.confirm(t('confirmCancel'))) return;
    setError(null);
    setBusyId(booking.id);
    cancel.mutate(booking.id, {
      onSuccess: () => router.refresh(),
      onError: (err) => setError(err.message),
      onSettled: () => setBusyId(null),
    });
  };

  return (
    <ul className="space-y-3">
      {error ? (
        <li role="alert" className="text-sm text-rose-600">
          {error}
        </li>
      ) : null}

      {bookings.map((booking) => (
        <li
          key={booking.id}
          className="border-border flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4"
        >
          <div className="min-w-0 space-y-1">
            <Link
              href={`/listings/${booking.listing.slug}` as Route}
              className="font-medium hover:underline"
            >
              {booking.listing.title.en}
            </Link>
            <p className="text-foreground-muted text-sm">
              {booking.checkIn} → {booking.checkOut} ·{' '}
              {t('nights', { count: booking.pricing.nights })} ·{' '}
              {t('guests', { count: booking.guestCount })}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={badgeVariant(booking.status)}>{t(`status.${booking.status}`)}</Badge>
              {/* Always the SNAPSHOT total — what the guest was quoted, not what
                  the listing costs today. */}
              <span className="text-sm tabular-nums">
                {booking.pricing.total} {booking.pricing.currency}
              </span>
              {booking.status === 'pending' ? (
                <span className="text-foreground-muted text-xs">
                  {t('expiresAt')}: {new Date(booking.expiresAt).toLocaleString()}
                </span>
              ) : null}
            </div>
            {booking.declineReason ? (
              // Plain text node: the host's reason is untrusted input.
              <p className="text-foreground-muted text-xs">{booking.declineReason}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <OpenThreadButton bookingId={booking.id} basePath="/account/messages" />
            {CANCELLABLE.has(booking.status) ? (
              <Button
                variant="destructiveGhost"
                size="sm"
                disabled={busyId === booking.id}
                onClick={() => onCancel(booking)}
              >
                {busyId === booking.id ? t('cancelling') : t('cancel')}
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
