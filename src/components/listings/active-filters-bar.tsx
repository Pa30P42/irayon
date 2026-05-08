'use client';

import { useRegionsWithVillages } from '@/hooks/use-public-regions';
import { useLocale } from '@/hooks/use-locale';
import { toggleOption } from '@/lib/listings-filter';
import { cn, pickLocalized } from '@/lib/utils';
import type { FilterGroupName, ListingsFilterState } from '@/types';
import { IconX } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

type ActiveFiltersBarProps = {
  state: ListingsFilterState;
  onChange: (next: ListingsFilterState) => void;
  onReset: () => void;
};

type Chip = { group: FilterGroupName; option: string; label: string };

export function ActiveFiltersBar({ state, onChange, onReset }: ActiveFiltersBarProps) {
  const t = useTranslations('filter');
  const tOptions = useTranslations('filter.options');
  const { locale } = useLocale();
  const { data: regions } = useRegionsWithVillages();

  // Build village slug → localized label so chips show readable names instead
  // of slugs. Falls back to the slug while regions are loading.
  const villageLabelBySlug = useMemo(() => {
    const map = new Map<string, string>();
    if (!regions) return map;
    for (const region of regions) {
      for (const v of region.villages) {
        map.set(v.slug, pickLocalized(v.name, locale));
      }
    }
    return map;
  }, [regions, locale]);

  const chips: Chip[] = [
    ...state.village.map((o) => ({
      group: 'village' as const,
      option: o,
      label: villageLabelBySlug.get(o) ?? o,
    })),
    ...state.type.map((o) => ({
      group: 'type' as const,
      option: o,
      label: tOptions(`type.${o}`),
    })),
    ...(state.guests
      ? [
          {
            group: 'guests' as const,
            option: state.guests,
            label: tOptions(`guests.${state.guests}`),
          },
        ]
      : []),
    ...state.placement.map((o) => ({
      group: 'placement' as const,
      option: o,
      label: tOptions(`placement.${o}`),
    })),
    ...state.food.map((o) => ({
      group: 'food' as const,
      option: o,
      label: tOptions(`food.${o}`),
    })),
    ...state.extra.map((o) => ({
      group: 'extra' as const,
      option: o,
      label: tOptions(`extra.${o}`),
    })),
    ...state.basic.map((o) => ({
      group: 'basic' as const,
      option: o,
      label: tOptions(`basic.${o}`),
    })),
    ...state.fun.map((o) => ({
      group: 'fun' as const,
      option: o,
      label: tOptions(`fun.${o}`),
    })),
  ];

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-3">
      {chips.map((chip) => (
        <button
          key={`${chip.group}:${chip.option}`}
          type="button"
          onClick={() => onChange(toggleOption(state, chip.group, chip.option))}
          className={cn(
            'border-border hover:bg-accent inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
          )}
          aria-label={`Remove ${chip.label}`}
        >
          <span>{chip.label}</span>
          <IconX size={14} aria-hidden />
        </button>
      ))}
      <button
        type="button"
        onClick={onReset}
        className="text-primary ml-2 text-sm font-medium underline-offset-2 hover:underline"
      >
        {t('resetAll')}
      </button>
    </div>
  );
}
