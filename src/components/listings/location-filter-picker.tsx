'use client';
// Region-grouped, searchable village picker. Replaces the flat village
// checkbox group inside the filter modal — booking.com / hotels.com pattern.

import { useLocale } from '@/hooks/use-locale';
import { useRegionsWithVillages } from '@/hooks/use-public-regions';
import { cn, pickLocalized } from '@/lib/utils';
import type { ListingsFilterState, RegionWithVillages } from '@/types';
import {
  IconChevronDown,
  IconChevronRight,
  IconLoader2,
  IconMapPin,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

type LocationFilterPickerProps = {
  state: Pick<ListingsFilterState, 'region' | 'village'>;
  onChange: (next: { region: string[]; village: string[] }) => void;
};

const normalize = (s: string): string => s.trim().toLowerCase();

/**
 * Returns regions filtered by `query`. A region matches if its name OR any
 * of its villages' names contain the query (in any of the three locales).
 * Match results carry their matching villages to drive auto-expand.
 */
function filterRegions(
  regions: readonly RegionWithVillages[],
  query: string,
): { matched: RegionWithVillages[]; matchingVillagesByRegion: Map<string, Set<string>> } {
  const q = normalize(query);
  if (!q) return { matched: [...regions], matchingVillagesByRegion: new Map() };

  const matched: RegionWithVillages[] = [];
  const matchingVillagesByRegion = new Map<string, Set<string>>();

  for (const region of regions) {
    const regionHay = [region.slug, region.name.en, region.name.ru, region.name.az]
      .map(normalize)
      .join(' ');
    const regionMatches = regionHay.includes(q);

    const villageHits = new Set<string>();
    for (const v of region.villages) {
      const hay = [v.slug, v.name.en, v.name.ru, v.name.az].map(normalize).join(' ');
      if (hay.includes(q)) villageHits.add(v.slug);
    }

    if (regionMatches || villageHits.size > 0) {
      matched.push(region);
      if (villageHits.size > 0) matchingVillagesByRegion.set(region.slug, villageHits);
    }
  }

  return { matched, matchingVillagesByRegion };
}

export function LocationFilterPicker({ state, onChange }: LocationFilterPickerProps) {
  const t = useTranslations('filter');
  const { locale } = useLocale();
  const { data: regions, isLoading } = useRegionsWithVillages();

  const [query, setQuery] = useState('');
  const [manuallyExpanded, setManuallyExpanded] = useState<Set<string>>(new Set());

  const selectedRegions = useMemo(() => new Set(state.region), [state.region]);
  const selectedVillages = useMemo(() => new Set(state.village), [state.village]);

  const { matched, matchingVillagesByRegion } = useMemo(
    () => filterRegions(regions ?? [], query),
    [regions, query],
  );

  // A region is "expanded" if the user toggled it open, OR a search match
  // landed inside it, OR its checkbox is selected, OR any of its villages
  // are selected (so user sees what's already chosen at a glance).
  const isExpanded = (regionSlug: string): boolean => {
    if (manuallyExpanded.has(regionSlug)) return true;
    if (selectedRegions.has(regionSlug)) return true;
    if (matchingVillagesByRegion.has(regionSlug)) return true;
    const region = regions?.find((r) => r.slug === regionSlug);
    if (region && region.villages.some((v) => selectedVillages.has(v.slug))) return true;
    return false;
  };

  const toggleManualExpand = (regionSlug: string) => {
    setManuallyExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(regionSlug)) next.delete(regionSlug);
      else next.add(regionSlug);
      return next;
    });
  };

  const toggleRegion = (regionSlug: string) => {
    const next = new Set(state.region);
    if (next.has(regionSlug)) next.delete(regionSlug);
    else next.add(regionSlug);
    onChange({ region: Array.from(next), village: state.village });
  };

  const toggleVillage = (villageSlug: string) => {
    const next = new Set(state.village);
    if (next.has(villageSlug)) next.delete(villageSlug);
    else next.add(villageSlug);
    onChange({ region: state.region, village: Array.from(next) });
  };

  const clearAll = () => {
    onChange({ region: [], village: [] });
    setQuery('');
  };

  const totalSelected = state.region.length + state.village.length;

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
