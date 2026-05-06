'use client';
// Client component: holds date range + guest state and renders the breakdown.

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useBookingCalculator } from '@/hooks/use-booking-calculator';
import { formatPrice } from '@/lib/utils';
import type { Locale } from '@/types';
import { IconCalendar } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

type BookingCardProps = {
  pricePerNight: number;
  capacity: number;
  locale: Locale;
};

const dateLocaleFor = (locale: string): string => {
  switch (locale) {
    case 'az':
      return 'az-AZ';
    case 'ru':
      return 'ru-RU';
    default:
      return 'en-US';
  }
};

export function BookingCard({ pricePerNight, capacity, locale }: BookingCardProps) {
  const t = useTranslations('detail.booking');
  const tCommon = useTranslations('common');

  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [guests, setGuests] = useState<number>(2);

  const breakdown = useBookingCalculator({ pricePerNight, range });

  const fmtDate = (date: Date | undefined) =>
    date
      ? new Intl.DateTimeFormat(dateLocaleFor(locale), { dateStyle: 'medium' }).format(date)
      : t('selectDates');

  const fmtMoney = (amount: number) => `${formatPrice(amount, locale)} ${tCommon('currency')}`;

  return (
    <aside className="border-border bg-background sticky top-24 space-y-4 rounded-2xl border p-6 shadow-sm">
      <p className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold">{fmtMoney(pricePerNight)}</span>
        <span className="text-foreground-muted text-sm">{t('perNight')}</span>
      </p>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="border-border hover:bg-accent focus-visible:ring-primary grid w-full grid-cols-2 gap-2 rounded-md border p-3 text-left text-sm focus-visible:ring-2 focus-visible:outline-none"
            aria-label={t('selectDates')}
          >
            <DateCell label={t('checkIn')} value={fmtDate(range?.from)} />
            <DateCell label={t('checkOut')} value={fmtDate(range?.to)} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={range}
            onSelect={setRange}
            numberOfMonths={1}
            disabled={{ before: new Date() }}
          />
        </PopoverContent>
      </Popover>

      <div>
        <Label
          htmlFor="booking-guests"
          className="mb-1 block text-xs font-medium tracking-wide uppercase"
        >
          {t('guests')}
        </Label>
        <Input
          id="booking-guests"
          type="number"
          min={1}
          max={capacity}
          value={guests}
          onChange={(e) => {
            const next = Number(e.target.value) || 1;
            setGuests(Math.min(Math.max(next, 1), capacity));
          }}
        />
      </div>

      <Button size="lg" className="w-full">
        {t('contactHost')}
      </Button>

      {breakdown.isValid ? (
        <div className="border-border space-y-2 border-t pt-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-foreground-muted">
              {t('nightsX', { nights: breakdown.nights, price: fmtMoney(pricePerNight) })}
            </span>
            <span className="tabular-nums">{fmtMoney(breakdown.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-foreground-muted">{t('cleaningFee')}</span>
            <span className="tabular-nums">{fmtMoney(breakdown.cleaningFee)}</span>
          </div>
          <div className="border-border flex items-center justify-between border-t pt-3 font-semibold">
            <span>{t('total')}</span>
            <span className="tabular-nums">{fmtMoney(breakdown.total)}</span>
          </div>
        </div>
      ) : (
        <p className="text-foreground-muted text-center text-xs">{t('selectDatesFirst')}</p>
      )}
    </aside>
  );
}

function DateCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-foreground-muted flex items-center gap-1 text-xs font-medium tracking-wide uppercase">
        <IconCalendar size={12} aria-hidden />
        {label}
      </p>
      <p className="mt-1 truncate text-sm">{value}</p>
    </div>
  );
}
