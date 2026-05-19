'use client';

import { useLocale } from '@/hooks/use-locale';
import { useRegionsWithVillages } from '@/hooks/use-public-regions';
import { toggleOption } from '@/lib/listings-filter';
import { cn, pickLocalized } from '@/lib/utils';
import type { FilterGroupName, ListingsFilterState } from '@/types';
import { IconAlertCircle, IconCheck, IconLink, IconX } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

const COPIED_FEEDBACK_MS = 1800;

type CopyStatus = 'idle' | 'copied' | 'error';

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

  // Build region/village slug → localized label so chips show readable names
  // instead of slugs. Falls back to the slug while regions are loading.
  const { regionLabelBySlug, villageLabelBySlug } = useMemo(() => {
    const regionMap = new Map<string, string>();
    const villageMap = new Map<string, string>();
    if (!regions) return { regionLabelBySlug: regionMap, villageLabelBySlug: villageMap };
    for (const region of regions) {
      regionMap.set(region.slug, pickLocalized(region.name, locale));
      for (const v of region.villages) {
        villageMap.set(v.slug, pickLocalized(v.name, locale));
      }
    }
    return { regionLabelBySlug: regionMap, villageLabelBySlug: villageMap };
  }, [regions, locale]);

  const chips: Chip[] = [
    ...state.region.map((o) => ({
      group: 'region' as const,
      option: o,
      label: regionLabelBySlug.get(o) ?? o,
    })),
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
    <div className="space-y-2 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <button
            key={`${chip.group}:${chip.option}`}
            type="button"
            onClick={() => onChange(toggleOption(state, chip.group, chip.option))}
            className="border-border hover:bg-accent inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors"
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
      <div className="flex justify-end">
        <CopyLinkButton />
      </div>
    </div>
  );
}

/**
 * Copies the current URL to the clipboard with brief inline feedback.
 * Inline state instead of a global toast — the project has no toast library
 * wired up, and the confirmation only needs to live where the click happened.
 */
function CopyLinkButton() {
  const t = useTranslations('filter');
  const [status, setStatus] = useState<CopyStatus>('idle');

  useEffect(() => {
    if (status === 'idle') return;
    const id = window.setTimeout(() => setStatus('idle'), COPIED_FEEDBACK_MS);
    return () => window.clearTimeout(id);
  }, [status]);

  const onClick = async () => {
    // Insecure contexts (http://, older Safari) leave navigator.clipboard
    // undefined; treat that and any rejected write as an error so the user
    // sees something happened.
    if (!navigator.clipboard?.writeText) {
      setStatus('error');
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
  };

  const label =
    status === 'copied' ? t('copied') : status === 'error' ? t('copyFailed') : t('copyLink');
  const Icon = status === 'copied' ? IconCheck : status === 'error' ? IconAlertCircle : IconLink;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'border-border inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
        status === 'copied' && 'border-primary text-primary',
        status === 'error' && 'border-destructive text-destructive',
        status === 'idle' && 'hover:bg-accent',
      )}
    >
      <Icon size={14} aria-hidden />
      <span aria-live="polite">{label}</span>
    </button>
  );
}
