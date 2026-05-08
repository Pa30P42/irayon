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
import { useFilterModal } from '@/hooks/use-filter-modal';
import {
  ACTIVITIES,
  BASIC_AMENITIES,
  EXTRA_AMENITIES,
  GUEST_RANGES,
  MEALS,
  PLACEMENTS,
  PLACE_TYPES,
} from '@/lib/constants';
import { applyListingsFilter, countActiveFilters } from '@/lib/listings-filter';
import type { Listing, ListingsFilterState } from '@/types';
import { IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { FilterGroup } from './filter-group';
import { LocationFilterPicker } from './location-filter-picker';

type FilterModalProps = {
  state: ListingsFilterState;
  listings: Listing[];
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

  const liveCount = useMemo(() => applyListingsFilter(listings, draft).length, [listings, draft]);
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
      <DialogContent>
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
            title={t('groups.type')}
            group="type"
            options={PLACE_TYPES}
            labelFor={(o) => tOptions(`type.${o}`)}
            state={draft}
            listings={listings}
            onToggle={(opt) => toggle('type', opt)}
          />
          <FilterGroup
            title={t('groups.guests')}
            group="guests"
            options={GUEST_RANGES}
            labelFor={(o) => tOptions(`guests.${o}`)}
            state={draft}
            listings={listings}
            onToggle={(opt) => toggle('guests', opt)}
          />
          <FilterGroup
            title={t('groups.placement')}
            group="placement"
            options={PLACEMENTS}
            labelFor={(o) => tOptions(`placement.${o}`)}
            state={draft}
            listings={listings}
            onToggle={(opt) => toggle('placement', opt)}
          />
          <FilterGroup
            title={t('groups.food')}
            group="food"
            options={MEALS}
            labelFor={(o) => tOptions(`food.${o}`)}
            state={draft}
            listings={listings}
            onToggle={(opt) => toggle('food', opt)}
          />
          <FilterGroup
            title={t('groups.extra')}
            group="extra"
            options={EXTRA_AMENITIES}
            labelFor={(o) => tOptions(`extra.${o}`)}
            state={draft}
            listings={listings}
            onToggle={(opt) => toggle('extra', opt)}
          />
          <FilterGroup
            title={t('groups.basic')}
            group="basic"
            options={BASIC_AMENITIES}
            labelFor={(o) => tOptions(`basic.${o}`)}
            state={draft}
            listings={listings}
            onToggle={(opt) => toggle('basic', opt)}
          />
          <FilterGroup
            title={t('groups.fun')}
            group="fun"
            options={ACTIVITIES}
            labelFor={(o) => tOptions(`fun.${o}`)}
            state={draft}
            listings={listings}
            onToggle={(opt) => toggle('fun', opt)}
          />
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
