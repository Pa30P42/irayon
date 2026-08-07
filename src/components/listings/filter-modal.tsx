'use client';
// Client component: orchestrates draft state inside a Radix Dialog.

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Stepper } from '@/components/ui/stepper';
import { useAmenities } from '@/hooks/use-amenities';
import { useFilterModal } from '@/hooks/use-filter-modal';
import { useListings } from '@/hooks/use-listings';
import { useLocale } from '@/hooks/use-locale';
import {
  ACTIVITIES,
  BASIC_AMENITIES,
  CATEGORIES,
  EXTRA_AMENITIES,
  GUEST_RANGES,
  MEALS,
  PLACEMENTS,
  PLACE_TYPES,
  PRICE_BOUNDS,
} from '@/lib/constants';
import { applyListingsFilter, countActiveFilters } from '@/lib/listings-filter';
import { pickLocalized } from '@/lib/utils';
import type { ListingCardDto, ListingsFilterState } from '@/types';
import { IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { FilterGroup } from './filter-group';
import { LocationFilterPicker } from './location-filter-picker';

type FilterModalProps = {
  state: ListingsFilterState;
  /**
   * Listings used to compute live compatibility counts and the apply-button
   * total. Optional: when omitted, the modal fetches its own batch lazily on
   * first open. Use this from places like the home hero where the modal may
   * never be opened — the page shouldn't pay for the fetch upfront.
   */
  listings?: ListingCardDto[];
  onApply: (next: ListingsFilterState) => void;
  trigger?: ReactNode;
};

export function FilterModal({ state, listings, onApply, trigger }: FilterModalProps) {
  const t = useTranslations('filter');
  const tOptions = useTranslations('filter.options');

  const { open, setOpen, draft, setDraft, toggle, reset, apply } = useFilterModal({
    initial: state,
    onApply,
  });
  const { locale } = useLocale();

  // DB-driven amenity catalogue: an amenity created in /admin/amenities shows
  // up here without a code change. Legacy "basic" slugs keep their group; new
  // ones land under "extra". Fetch only while the modal is open; the static
  // constants serve as the fallback while loading.
  const { data: amenityCatalogue } = useAmenities({ enabled: open });
  const { basicOptions, extraOptions, amenityLabel } = useMemo(() => {
    if (!amenityCatalogue || amenityCatalogue.length === 0) {
      return {
        basicOptions: BASIC_AMENITIES,
        extraOptions: EXTRA_AMENITIES,
        amenityLabel: null as Map<string, string> | null,
      };
    }
    const basicSet = new Set<string>(BASIC_AMENITIES);
    const labels = new Map<string, string>();
    const basic: string[] = [];
    const extra: string[] = [];
    for (const a of amenityCatalogue) {
      labels.set(a.slug, pickLocalized(a.name, locale));
      (basicSet.has(a.slug) ? basic : extra).push(a.slug);
    }
    return { basicOptions: basic, extraOptions: extra, amenityLabel: labels };
  }, [amenityCatalogue, locale]);

  // Lazy-fetch only when the caller didn't pass listings AND the modal is
  // open. Once fetched, TanStack Query caches the result so re-opening is
  // instant. When the caller does pass listings, this query stays disabled.
  const { data: lazyListings } = useListings(
    { sort: 'newest', limit: 100 },
    { enabled: listings === undefined && open },
  );
  // Memoize so identity is stable across renders that don't change either
  // input — otherwise the `liveCount` useMemo below sees a fresh array every
  // render and recomputes the (O(N) per filter group) filter unnecessarily.
  const effectiveListings = useMemo(
    () => listings ?? lazyListings?.data ?? [],
    [listings, lazyListings?.data],
  );

  const liveCount = useMemo(
    () => applyListingsFilter(effectiveListings, draft).length,
    [effectiveListings, draft],
  );
  const activeCount = countActiveFilters(state);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="gap-2">
            <IconAdjustmentsHorizontal size={18} />
            {t('title')}
            {activeCount > 0 ? (
              <span className="bg-primary ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs text-white">
                {activeCount}
              </span>
            ) : null}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="h-auto max-h-[90dvh] w-[calc(100%-1.5rem)] rounded-2xl sm:max-h-[90vh] sm:w-full">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription className="sr-only">{t('title')}</DialogDescription>
        </DialogHeader>

        <div className="grid flex-1 grid-cols-1 gap-x-10 gap-y-8 overflow-y-auto px-6 py-6 sm:grid-cols-2">
          <LocationFilterPicker
            state={{ region: draft.region, village: draft.village }}
            onChange={({ region, village }) => setDraft({ ...draft, region, village })}
          />
          <FilterGroup
            title={t('groups.category')}
            group="category"
            options={CATEGORIES}
            labelFor={(o) => tOptions(`category.${o}`)}
            state={draft}
            listings={effectiveListings}
            onToggle={(opt) => toggle('category', opt)}
          />
          <FilterGroup
            title={t('groups.type')}
            group="type"
            options={PLACE_TYPES}
            labelFor={(o) => tOptions(`type.${o}`)}
            state={draft}
            listings={effectiveListings}
            onToggle={(opt) => toggle('type', opt)}
          />
          <FilterGroup
            title={t('groups.guests')}
            group="guests"
            options={GUEST_RANGES}
            labelFor={(o) => tOptions(`guests.${o}`)}
            state={draft}
            listings={effectiveListings}
            onToggle={(opt) => toggle('guests', opt)}
          />
          <FilterGroup
            title={t('groups.placement')}
            group="placement"
            options={PLACEMENTS}
            labelFor={(o) => tOptions(`placement.${o}`)}
            state={draft}
            listings={effectiveListings}
            onToggle={(opt) => toggle('placement', opt)}
          />
          <FilterGroup
            title={t('groups.food')}
            group="food"
            options={MEALS}
            labelFor={(o) => tOptions(`food.${o}`)}
            state={draft}
            listings={effectiveListings}
            onToggle={(opt) => toggle('food', opt)}
          />
          <FilterGroup
            title={t('groups.extra')}
            group="extra"
            options={extraOptions}
            labelFor={(o) => amenityLabel?.get(o) ?? tOptions(`extra.${o}`)}
            state={draft}
            listings={effectiveListings}
            onToggle={(opt) => toggle('extra', opt)}
          />
          <FilterGroup
            title={t('groups.basic')}
            group="basic"
            options={basicOptions}
            labelFor={(o) => amenityLabel?.get(o) ?? tOptions(`basic.${o}`)}
            state={draft}
            listings={effectiveListings}
            onToggle={(opt) => toggle('basic', opt)}
          />
          <FilterGroup
            title={t('groups.fun')}
            group="fun"
            options={ACTIVITIES}
            labelFor={(o) => tOptions(`fun.${o}`)}
            state={draft}
            listings={effectiveListings}
            onToggle={(opt) => toggle('fun', opt)}
          />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{t('groups.price')}</h3>
            <div className="flex items-center gap-2">
              <label className="flex-1">
                <span className="text-foreground-muted text-xs">{t('priceMin')}</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={PRICE_BOUNDS.min}
                  max={PRICE_BOUNDS.max}
                  step={PRICE_BOUNDS.step}
                  placeholder={String(PRICE_BOUNDS.min)}
                  value={draft.price_min ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      price_min: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </label>
              <span className="text-foreground-muted mt-4">–</span>
              <label className="flex-1">
                <span className="text-foreground-muted text-xs">{t('priceMax')}</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={PRICE_BOUNDS.min}
                  max={PRICE_BOUNDS.max}
                  step={PRICE_BOUNDS.step}
                  placeholder={String(PRICE_BOUNDS.max)}
                  value={draft.price_max ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      price_max: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{t('groups.capacity')}</h3>
            <Stepper
              value={draft.capacity ?? 0}
              min={0}
              max={50}
              onChange={(next) => setDraft({ ...draft, capacity: next === 0 ? null : next })}
              ariaLabel={t('groups.capacity')}
            />
            <p className="text-foreground-muted text-xs">{t('capacityHint')}</p>
          </section>
        </div>

        <div className="border-border bg-background sticky bottom-0 flex items-center justify-between gap-3 border-t px-6 py-4">
          <Button variant="ghost" onClick={reset}>
            {t('reset')}
          </Button>
          <Button onClick={apply} size="lg" disabled={liveCount === 0}>
            {t('apply', { count: liveCount })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
