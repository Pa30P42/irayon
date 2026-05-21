'use client';
// Region-grouped, searchable village picker. Replaces the flat village
// checkbox group inside the filter modal — booking.com / hotels.com pattern.

import { useLocale } from '@/hooks/use-locale';
import { useLocationFilterPicker } from '@/hooks/use-location-filter-picker';
import { cn, pickLocalized } from '@/lib/utils';
import type { ListingsFilterState } from '@/types';
import {
  IconChevronDown,
  IconChevronRight,
  IconLoader2,
  IconMapPin,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

type LocationFilterPickerProps = {
  state: Pick<ListingsFilterState, 'region' | 'village'>;
  onChange: (next: { region: string[]; village: string[] }) => void;
};

export function LocationFilterPicker({ state, onChange }: LocationFilterPickerProps) {
  const t = useTranslations('filter');
  const { locale } = useLocale();
  const {
    isLoading,
    query,
    setQuery,
    matched,
    matchingVillagesByRegion,
    selectedRegions,
    selectedVillages,
    isExpanded,
    toggleManualExpand,
    toggleRegion,
    toggleVillage,
    clearAll,
    totalSelected,
  } = useLocationFilterPicker({ state, onChange });

  return (
    <fieldset className="col-span-full space-y-3">
      <div className="flex items-center justify-between gap-2">
        <legend className="text-sm font-semibold">{t('groups.village')}</legend>
        {totalSelected > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-foreground-muted hover:text-foreground inline-flex items-center gap-1 text-xs"
          >
            <IconX size={12} />
            Clear ({totalSelected})
          </button>
        ) : null}
      </div>

      <div className="border-border focus-within:ring-primary flex items-center gap-2 rounded-md border px-3 py-2 focus-within:ring-2">
        <IconSearch size={16} className="text-foreground-muted shrink-0" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('locationSearchPlaceholder')}
          className="placeholder:text-foreground-muted flex-1 bg-transparent text-sm outline-none"
          aria-label={t('locationSearchPlaceholder')}
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-foreground-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <IconX size={14} />
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="text-foreground-muted flex items-center justify-center gap-2 py-6 text-sm">
          <IconLoader2 size={16} className="animate-spin" /> {t('loading')}
        </div>
      ) : matched.length === 0 ? (
        <p className="text-foreground-muted py-6 text-center text-sm">{t('locationNoResults')}</p>
      ) : (
        <ul className="border-border max-h-80 overflow-y-auto rounded-md border">
          {matched.map((region, idx) => {
            const expanded = isExpanded(region.slug);
            const regionChecked = selectedRegions.has(region.slug);
            const villagesInRegion = region.villages.length;
            const selectedVillagesInRegion = region.villages.filter((v) =>
              selectedVillages.has(v.slug),
            ).length;
            const regionLabel = pickLocalized(region.name, locale);
            const matchingForThis = matchingVillagesByRegion.get(region.slug);

            return (
              <li key={region.slug} className={cn(idx > 0 && 'border-border border-t')}>
                <div className="flex items-stretch">
                  <label
                    className="hover:bg-accent flex flex-1 cursor-pointer items-center gap-3 px-3 py-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={regionChecked}
                      onChange={() => toggleRegion(region.slug)}
                      aria-label={`Select all listings in ${regionLabel}`}
                      className="border-border accent-primary h-4 w-4 cursor-pointer"
                    />
                    <span className="flex flex-1 items-center gap-2 text-sm">
                      <IconMapPin
                        size={14}
                        className="text-foreground-muted shrink-0"
                        aria-hidden
                      />
                      <span className={cn('font-medium', regionChecked && 'text-primary')}>
                        {regionLabel}
                      </span>
                    </span>
                    <span className="text-foreground-muted text-xs">
                      {selectedVillagesInRegion > 0 ? (
                        <span className="text-primary mr-1 font-medium">
                          {selectedVillagesInRegion}
                        </span>
                      ) : null}
                      {villagesInRegion} {villagesInRegion === 1 ? 'village' : 'villages'}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleManualExpand(region.slug)}
                    className="hover:bg-accent border-border border-l px-3"
                    aria-label={expanded ? 'Collapse' : 'Expand'}
                    aria-expanded={expanded}
                  >
                    {expanded ? (
                      <IconChevronDown size={16} className="text-foreground-muted" />
                    ) : (
                      <IconChevronRight size={16} className="text-foreground-muted" />
                    )}
                  </button>
                </div>

                {expanded && villagesInRegion > 0 ? (
                  <div
                    className={cn(
                      'flex flex-wrap gap-1.5 px-3 pt-1 pb-3',
                      regionChecked && 'opacity-60',
                    )}
                  >
                    {region.villages.map((v) => {
                      const checked = selectedVillages.has(v.slug);
                      const isSearchMatch = matchingForThis?.has(v.slug) ?? false;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => toggleVillage(v.slug)}
                          aria-pressed={checked}
                          title={
                            regionChecked
                              ? `Already included via "${regionLabel}"`
                              : pickLocalized(v.name, locale)
                          }
                          className={cn(
                            'rounded-full border px-3 py-1 text-xs transition-colors',
                            checked
                              ? 'border-primary bg-primary text-white'
                              : 'border-border hover:bg-accent text-foreground bg-background',
                            isSearchMatch && !checked && 'ring-primary/40 ring-1',
                          )}
                        >
                          {pickLocalized(v.name, locale)}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </fieldset>
  );
}
