'use client';
// Client component: holds the date range state for the booking breakdown.

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useBookingCalculator } from '@/hooks/use-booking-calculator';
import { formatPrice } from '@/lib/utils';
import type { Listing, Locale } from '@/types';
import { IconCalendar } from '@tabler/icons-react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useState } from 'react';
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

export function BookingCard({ listing, locale }: BookingCardProps) {
  const t = useTranslations('detail.booking');
  const tCommon = useTranslations('common');
  const [range, setRange] = useState<DateRange | undefined>(undefined);

  const fmtMoney = (amount: number) => `${formatPrice(amount, locale)} ${tCommon('currency')}`;
  const breakdown = useBookingCalculator({
    pricePerNight: listing.price,
    cleaningFee: listing.cleaningFee,
    range,
  });

  const rangeLabel =
    range?.from && range?.to
      ? `${format(range.from, 'd MMM')} – ${format(range.to, 'd MMM')}`
      : t('selectDates');

  return (
    <aside className="border-border bg-background sticky top-24 space-y-5 rounded-2xl border p-6 shadow-sm">
      <p className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold">{fmtMoney(listing.price)}</span>
        <span className="text-foreground-muted text-sm">{t('perNight')}</span>
      </p>

      <Popover>
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
            disabled={{ before: new Date() }}
          />
        </PopoverContent>
      </Popover>

      {breakdown.isValid ? (
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
          <div className="flex items-center justify-between">
            <dt>{t('cleaningFee')}</dt>
            <dd className="text-foreground tabular-nums">{fmtMoney(breakdown.cleaningFee)}</dd>
          </div>
          <div className="border-border text-foreground flex items-center justify-between border-t pt-2 text-base font-semibold">
            <dt>{t('total')}</dt>
            <dd className="tabular-nums">{fmtMoney(breakdown.total)}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-foreground-muted text-xs">{t('selectDatesFirst')}</p>
      )}

      <CallButton listingId={listing.id} phone={listing.phone} source="detail" />
    </aside>
  );
}
