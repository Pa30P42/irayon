'use client';

import { OpenThreadButton } from '@/components/messaging/open-thread-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  isHostBookingErrorCode,
  useAcceptBooking,
  useDeclineBooking,
  useHostCancelBooking,
} from '@/hooks/use-host-booking-actions';
import type { BookingDto } from '@/lib/api/booking-dto';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const badgeVariant = (status: string): 'default' | 'solid' | 'outline' =>
  status === 'accepted' ? 'solid' : status === 'pending' ? 'default' : 'outline';

export function HostBookingList({ bookings }: { bookings: BookingDto[] }) {
  const t = useTranslations('host.bookings');
  const tAccount = useTranslations('account');
  const router = useRouter();

  const accept = useAcceptBooking();
  const decline = useDeclineBooking();
  const cancel = useHostCancelBooking();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const showError = (err: Error) =>
    setError(
      isHostBookingErrorCode(err.message) ? t(`errors.${err.message}`) : t('errors.generic'),
    );

  const run = (
    mutation: { mutate: (v: { id: string; reason?: string }, o: object) => void },
    id: string,
    reasonText?: string,
  ) => {
    if (busyId) return;
    setError(null);
    setBusyId(id);
    mutation.mutate(
      { id, ...(reasonText ? { reason: reasonText } : {}) },
      {
        onSuccess: () => {
          setDecliningId(null);
          setReason('');
          router.refresh();
        },
        onError: showError,
        onSettled: () => setBusyId(null),
      },
    );
  };

  return (
    <ul className="space-y-3">
      {error ? (
        <li role="alert" className="text-sm text-rose-600">
          {error}
        </li>
      ) : null}

      {bookings.map((booking) => (
        <li key={booking.id} className="border-border space-y-3 rounded-xl border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="truncate font-medium">{booking.listing.title.en}</p>
              <p className="text-foreground-muted text-sm">
                {booking.checkIn} → {booking.checkOut} ·{' '}
                {tAccount('nights', { count: booking.pricing.nights })} ·{' '}
                {tAccount('guests', { count: booking.guestCount })}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={badgeVariant(booking.status)}>
                  {tAccount(`status.${booking.status}`)}
                </Badge>
                {/*
                  The SNAPSHOT total, always. If this showed current pricing, a
                  host who raised their price after the request would confirm a
                  booking believing it was worth more than the guest was quoted
                  — and with offline settlement that is a doorstep dispute with
                  no record of what either side agreed.
                */}
                <span className="text-sm font-medium tabular-nums">
                  {booking.pricing.total} {booking.pricing.currency}
                </span>
                <span className="text-foreground-muted text-xs">{t('priceAtRequest')}</span>
              </div>
              {booking.guest ? (
                <p className="text-foreground-muted text-sm">
                  {t('guest')}: {booking.guest.name || booking.guest.email}
                  {booking.guest.phone ? ` · ${booking.guest.phone}` : ''}
                </p>
              ) : null}
              {booking.status === 'pending' ? (
                <p className="text-foreground-muted text-xs">
                  {t('respondBy')}: {new Date(booking.expiresAt).toLocaleString()}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <OpenThreadButton bookingId={booking.id} basePath="/host/messages" />
              {booking.status === 'pending' ? (
                <>
                  <Button
                    size="sm"
                    disabled={busyId === booking.id}
                    onClick={() => run(accept, booking.id)}
                  >
                    {busyId === booking.id && accept.isPending ? t('accepting') : t('accept')}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructiveGhost"
                    disabled={busyId === booking.id}
                    onClick={() => setDecliningId(booking.id)}
                  >
                    {t('decline')}
                  </Button>
                </>
              ) : null}
              {booking.status === 'accepted' ? (
                <Button
                  size="sm"
                  variant="destructiveGhost"
                  disabled={busyId === booking.id}
                  onClick={() => {
                    if (window.confirm(t('confirmCancel'))) run(cancel, booking.id);
                  }}
                >
                  {t('cancel')}
                </Button>
              ) : null}
            </div>
          </div>

          {booking.guestNote ? (
            <div className="bg-accent rounded-md p-3">
              <p className="text-foreground-muted text-xs">{t('note')}</p>
              {/* Plain text node — the guest's note is untrusted input. */}
              <p className="text-sm">{booking.guestNote}</p>
            </div>
          ) : null}

          {decliningId === booking.id ? (
            <div className="space-y-2">
              <Textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('declineReason')}
                aria-label={t('declineReason')}
                maxLength={500}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busyId === booking.id}
                  onClick={() => run(decline, booking.id, reason.trim() || undefined)}
                >
                  {busyId === booking.id ? t('declining') : t('decline')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDecliningId(null);
                    setReason('');
                  }}
                >
                  {tAccount('cancel')}
                </Button>
              </div>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
