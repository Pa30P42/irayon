'use client';
// Client component: holds search inputs + filter draft, then navigates to /listings.

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FilterModal } from '@/components/listings/filter-modal';
import { useRouter } from '@/i18n/navigation';
import { mockListings } from '@/data/mock-listings';
import { emptyFilterState } from '@/lib/constants';
import { countActiveFilters } from '@/lib/listings-filter';
import { IconAdjustmentsHorizontal, IconMapPin, IconSearch, IconUsers } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ListingsFilterState } from '@/types';

const appendArray = (params: URLSearchParams, key: string, values: readonly string[]) => {
  if (values.length > 0) params.set(key, values.join(','));
};

export function HeroSearchBar() {
  const t = useTranslations('home.search');
  const router = useRouter();

  const [location, setLocation] = useState('');
  const [guests, setGuests] = useState<number>(2);
  const [filters, setFilters] = useState<ListingsFilterState>(() => emptyFilterState());
  const tFilter = useTranslations('filter');
  const activeCount = countActiveFilters(filters);

  const onSearch = () => {
    const params = new URLSearchParams();
    if (location.trim()) params.set('q', location.trim());
    if (guests > 0) params.set('capacity', String(guests));
    appendArray(params, 'direction', filters.direction);
    appendArray(params, 'type', filters.type);
    if (filters.guests) params.set('guests', filters.guests);
    appendArray(params, 'placement', filters.placement);
    appendArray(params, 'food', filters.food);
    appendArray(params, 'extra', filters.extra);
    appendArray(params, 'basic', filters.basic);
    appendArray(params, 'fun', filters.fun);
    const qs = params.toString();
    router.push(qs ? `/listings?${qs}` : '/listings');
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
      className="bg-background/95 border-border grid w-full max-w-4xl grid-cols-1 items-stretch gap-2 rounded-2xl border p-3 shadow-xl backdrop-blur md:grid-cols-[1.6fr_auto_1fr_auto]"
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

      <FilterModal
        state={filters}
        listings={mockListings}
        onApply={setFilters}
        trigger={
          <Button type="button" size="lg" variant="default" className="gap-2">
            <IconAdjustmentsHorizontal size={18} aria-hidden />
            <span>{tFilter('title')}</span>
            {activeCount > 0 ? (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-xs">
                {activeCount}
              </span>
            ) : null}
          </Button>
        }
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
