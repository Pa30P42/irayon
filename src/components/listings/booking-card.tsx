'use client';
// Client component: owns the date range, guest count, and the request itself.

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { toDisabledMatchers, useAvailability } from '@/hooks/use-availability';
import { useBookingCalculator } from '@/hooks/use-booking-calculator';
import { isBookingErrorCode, useCreateBooking } from '@/hooks/use-create-booking';
import { useSessionUser } from '@/hooks/use-session-user';
import { Link } from '@/i18n/navigation';
import { formatPrice } from '@/lib/utils';
import type { Listing, Locale } from '@/types';
import { IconCalendar } from '@tabler/icons-react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { CallButton } from './call-button';

// react-day-picker (+ its CSS + date-fns locale data) is a heavy dependency
// for a widget hidden behind a Popover — load it only when the popover opens.
const Calendar = dynamic(() => import('@/components/ui/calendar').then((m) => m.Calendar), {
  ssr: false,
  loading: () => (
    <div className="grid h-80 w-72 place-items-center p-4" aria-hidden>
      <div className="bg-accent h-64 w-full animate-pulse rounded-md" />
    </div>
  ),
});

type BookingCardProps = {
  listing: Listing;
  locale: Locale;
};

/** `Date` → `YYYY-MM-DD` in LOCAL terms, which is what the user picked. */
const toCalendarString = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function BookingCard({ listing, locale }: BookingCardProps) {
  const t = useTranslations('detail.booking');
  const tCommon = useTranslations('common');

  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [guestCount, setGuestCount] = useState(2);
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);

  const { data: user } = useSessionUser();
  // Availability is fetched only once the guest actually opens the calendar,
  // so a visitor who never picks dates costs nothing and the page stays on ISR.
  const { data: unavailable = [] } = useAvailability(listing.slug, { enabled: calendarOpen });
  const createBooking = useCreateBooking();

  const fmtMoney = (amount: number) => `${formatPrice(amount, locale)} ${tCommon('currency')}`;
  const breakdown = useBookingCalculator({
    pricePerNight: listing.price,
    cleaningFee: listing.cleaningFee,
    range,
  });

  const disabled = useMemo(
    () => [{ before: new Date() }, ...toDisabledMatchers(unavailable)],
    [unavailable],
  );

  const rangeLabel =
    range?.from && range?.to
      ? `${format(range.from, 'd MMM')} – ${format(range.to, 'd MMM')}`
      : t('selectDates');

  const errorMessage = (() => {
    if (!createBooking.error) return null;
    const raw = createBooking.error.message;
    return isBookingErrorCode(raw) ? t(`errors.${raw}`) : raw || t('errors.generic');
  })();

  const onSubmit = () => {
    if (!range?.from || !range?.to) return;
    createBooking.mutate(
      {
        listingId: listing.id,
        checkIn: toCalendarString(range.from),
        checkOut: toCalendarString(range.to),
        guestCount,
        ...(note.trim() ? { guestNote: note.trim() } : {}),
      },
      { onSuccess: () => setSent(true) },
    );
  };

  if (sent) {
    return (
      <aside className="border-border bg-background sticky top-24 space-y-4 rounded-2xl border p-6 shadow-sm">
        <p className="text-base font-semibold">{t('requestSent')}</p>
        <p className="text-foreground-muted text-sm">{t('requestSentBody')}</p>
        <Button asChild className="w-full">
          <Link href="/account/bookings">{t('viewMyBookings')}</Link>
        </Button>
      </aside>
    );
  }

  return (
    <aside className="border-border bg-background sticky top-24 space-y-5 rounded-2xl border p-6 shadow-sm">
      <p className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold">{fmtMoney(listing.price)}</span>
        <span className="text-foreground-muted text-sm">{t('perNight')}</span>
      </p>

      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start gap-2 font-normal">
            <IconCalendar size={16} className="text-foreground-muted" aria-hidden />
            <span className="truncate">{rangeLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={range}
            onSelect={setRange}
            numberOfMonths={1}
            disabled={disabled}
          />
        </PopoverContent>
      </Popover>

      {breakdown.isValid ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="guestCount">{t('guests')}</Label>
            <Input
              id="guestCount"
              type="number"
              inputMode="numeric"
              min={1}
              max={listing.capacity}
              value={guestCount}
              onChange={(e) => setGuestCount(Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="guestNote">{t('note')}</Label>
            <Textarea
              id="guestNote"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('notePlaceholder')}
              maxLength={1000}
            />
          </div>

          <dl className="text-foreground-muted space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt>
                {t('nightsX', {
                  nights: breakdown.nights,
                  price: fmtMoney(breakdown.pricePerNight),
                })}
              </dt>
              <dd className="text-foreground tabular-nums">{fmtMoney(breakdown.subtotal)}</dd>
            </div>
            {breakdown.cleaningFee > 0 ? (
              <div className="flex items-center justify-between">
                <dt>{t('cleaningFee')}</dt>
                <dd className="text-foreground tabular-nums">{fmtMoney(breakdown.cleaningFee)}</dd>
              </div>
            ) : null}
            <div className="border-border text-foreground flex items-center justify-between border-t pt-2 text-base font-semibold">
              <dt>{t('total')}</dt>
              <dd className="tabular-nums">{fmtMoney(breakdown.total)}</dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="text-foreground-muted text-xs">{t('selectDatesFirst')}</p>
      )}

      {errorMessage ? (
        <p role="alert" className="text-sm text-rose-600">
          {errorMessage}
        </p>
      ) : null}

      {user ? (
        <>
          <Button
            className="w-full"
            size="lg"
            disabled={!breakdown.isValid || createBooking.isPending}
            onClick={onSubmit}
          >
            {createBooking.isPending ? t('requesting') : t('request')}
          </Button>
          {/* Set expectations before the click, not after: this is
              request-to-book, and a guest who thinks they've reserved a place
              will turn up to a locked gate. */}
          <p className="text-foreground-muted text-center text-xs">{t('notInstant')}</p>
        </>
      ) : (
        <Button asChild className="w-full" size="lg">
          {/* Carry the current listing in `next` so signing in returns the
              guest to the page they were booking, not the homepage. */}
          <Link
            href={{ pathname: '/signin', query: { next: `/${locale}/listings/${listing.slug}` } }}
          >
            {t('signInToBook')}
          </Link>
        </Button>
      )}

      <CallButton listingId={listing.id} phone={listing.phone} source="detail" />
    </aside>
  );
}
