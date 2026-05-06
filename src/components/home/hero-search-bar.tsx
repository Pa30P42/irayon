'use client';
// Client component: holds search inputs and date popovers, then navigates.

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLocale } from '@/hooks/use-locale';
import { useRouter } from '@/i18n/navigation';
import { IconCalendar, IconMapPin, IconSearch, IconUsers } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

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

export function HeroSearchBar() {
  const t = useTranslations('home.search');
  const { locale } = useLocale();
  const router = useRouter();

  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();
  const [guests, setGuests] = useState<number>(2);

  const onSearch = () => {
    const params = new URLSearchParams();
    if (location.trim()) params.set('q', location.trim());
    if (checkIn) params.set('checkIn', checkIn.toISOString().slice(0, 10));
    if (checkOut) params.set('checkOut', checkOut.toISOString().slice(0, 10));
    if (guests > 0) params.set('capacity', String(guests));
    const qs = params.toString();
    router.push(qs ? `/listings?${qs}` : '/listings');
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
      className="bg-background/95 border-border grid w-full max-w-4xl grid-cols-1 items-stretch gap-2 rounded-2xl border p-3 shadow-xl backdrop-blur md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]"
    >
      <label className="hover:border-border flex items-center gap-2 rounded-md border border-transparent px-3">
        <IconMapPin size={18} className="text-foreground-muted" aria-hidden />
        <span className="sr-only">{t('location')}</span>
        <Input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t('placeholder')}
          className="border-none px-0 focus-visible:ring-0"
        />
      </label>

      <DateField
        label={t('checkIn')}
        placeholder={t('selectDate')}
        date={checkIn}
        onSelect={setCheckIn}
        locale={locale}
      />
      <DateField
        label={t('checkOut')}
        placeholder={t('selectDate')}
        date={checkOut}
        onSelect={setCheckOut}
        locale={locale}
        minDate={checkIn}
      />

      <label className="hover:border-border flex items-center gap-2 rounded-md border border-transparent px-3">
        <IconUsers size={18} className="text-foreground-muted" aria-hidden />
        <span className="sr-only">{t('guests')}</span>
        <Input
          type="number"
          min={1}
          max={20}
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value) || 1)}
          className="border-none px-0 focus-visible:ring-0"
        />
      </label>

      <Button type="submit" size="lg" className="md:w-12 md:px-0" aria-label={t('searchButton')}>
        <IconSearch size={18} />
        <span className="md:hidden">{t('searchButton')}</span>
      </Button>
    </form>
  );
}

type DateFieldProps = {
  label: string;
  placeholder: string;
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  locale: string;
  minDate?: Date;
};

function DateField({ label, placeholder, date, onSelect, locale, minDate }: DateFieldProps) {
  const display = date
    ? new Intl.DateTimeFormat(dateLocaleFor(locale), { dateStyle: 'medium' }).format(date)
    : placeholder;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="hover:border-border flex h-10 w-full items-center gap-2 rounded-md border border-transparent px-3 text-left text-sm"
          aria-label={label}
        >
          <IconCalendar size={18} className="text-foreground-muted" aria-hidden />
          <span className={date ? 'text-foreground' : 'text-foreground-muted'}>{display}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          disabled={minDate ? { before: minDate } : undefined}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
