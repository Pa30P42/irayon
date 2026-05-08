'use client';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useDebounce } from '@/hooks/use-debounce';
import { SORT_OPTIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Listing, ListingsFilterState, ListingsView, SortOption } from '@/types';
import { IconLayoutGrid, IconLayoutList, IconMap2, IconSearch } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { FilterModal } from './filter-modal';

type ListingsTopBarProps = {
  state: ListingsFilterState;
  listings: Listing[];
  sort: SortOption | null;
  view: ListingsView;
  onSearch: (q: string) => void;
  onApplyFilters: (next: ListingsFilterState) => void;
  onSortChange: (sort: SortOption | null) => void;
  onViewChange: (view: ListingsView) => void;
};

export function ListingsTopBar({
  state,
  listings,
  sort,
  view,
  onSearch,
  onApplyFilters,
  onSortChange,
  onViewChange,
}: ListingsTopBarProps) {
  const t = useTranslations('common');
  const tSort = useTranslations('listings.sort');
  const tView = useTranslations('listings.view');

  const [query, setQuery] = useState(state.q);
  const debounced = useDebounce(query, 250);

  // Push the debounced local query up when it diverges from the URL state.
  useEffect(() => {
    if (debounced !== state.q) onSearch(debounced);
  }, [debounced, state.q, onSearch]);

  // Pull the URL state down when it changes externally (chip removal,
  // back/forward, deep link with ?q=).
  useEffect(() => {
    setQuery(state.q);
  }, [state.q]);

  return (
    <div className="border-border flex flex-wrap items-center gap-3 border-b py-4">
      <label
        htmlFor="listings-search"
        className="border-border focus-within:ring-primary bg-background flex h-10 min-w-55 flex-1 items-center gap-2 rounded-md border px-3 focus-within:ring-2"
      >
        <IconSearch size={18} className="text-foreground-muted" aria-hidden />
        <span className="sr-only">{t('search')}</span>
        <Input
          id="listings-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search')}
          className="h-9 border-none px-0 focus-visible:ring-0"
        />
      </label>

      <FilterModal state={state} listings={listings} onApply={onApplyFilters} />

      <Select
        aria-label={tSort('label')}
        value={sort ?? ''}
        onChange={(e) => onSortChange((e.target.value as SortOption) || null)}
        className="h-10 w-44"
      >
        <option value="">{tSort('label')}</option>
        {SORT_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {tSort(s)}
          </option>
        ))}
      </Select>

      <div
        className="border-border flex h-10 items-center rounded-md border"
        role="group"
        aria-label={tView('label')}
      >
        <ViewButton
          active={view === 'grid'}
          onClick={() => onViewChange('grid')}
          label={tView('grid')}
          icon={<IconLayoutGrid size={18} />}
        />
        <ViewButton
          active={view === 'list'}
          onClick={() => onViewChange('list')}
          label={tView('list')}
          icon={<IconLayoutList size={18} />}
        />
        <ViewButton
          active={view === 'map'}
          onClick={() => onViewChange('map')}
          label={tView('map')}
          icon={<IconMap2 size={18} />}
        />
      </div>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'grid h-full w-10 place-items-center transition-colors first:rounded-l-md last:rounded-r-md',
        active ? 'bg-primary text-white' : 'text-foreground-muted hover:bg-accent',
      )}
    >
      {icon}
    </button>
  );
}
