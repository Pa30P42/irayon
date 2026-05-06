'use client';
// Client component: reads/writes the ?category= URL state via nuqs.

import { useCategoryFilter } from '@/hooks/use-category-filter';
import { HOME_CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { HomeCategory } from '@/types';
import {
  IconBeach,
  IconGrillFork,
  IconHome,
  IconMountain,
  IconSnowflake,
  IconSwimming,
  IconTrees,
  IconWaveSine,
  IconWorld,
  type Icon,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

const ICON_MAP: Record<HomeCategory, Icon> = {
  all: IconWorld,
  mountain: IconMountain,
  forest: IconTrees,
  river: IconWaveSine,
  sea: IconBeach,
  pool: IconSwimming,
  bbq: IconGrillFork,
  winter: IconSnowflake,
  cabin: IconHome,
};

export function CategoryFilterBar() {
  const t = useTranslations('home.categories');
  const { setCategory, isActive } = useCategoryFilter();

  return (
    <nav aria-label={t('all')} className="border-border bg-background sticky top-16 z-30 border-b">
      <div className="container-wide">
        <ul
          role="tablist"
          aria-label="Categories"
          className="scrollbar-thin -mx-4 flex gap-1 overflow-x-auto px-4 py-3 sm:mx-0 sm:gap-2 sm:px-0"
        >
          {HOME_CATEGORIES.map((c) => {
            const Icon = ICON_MAP[c];
            const active = isActive(c);
            return (
              <li key={c} className="shrink-0">
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-active={active || undefined}
                  onClick={() => setCategory(c)}
                  className={cn(
                    'group text-foreground-muted hover:text-foreground focus-visible:ring-primary relative flex flex-col items-center gap-1 rounded-md px-3 py-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
                    active && 'text-primary',
                  )}
                >
                  <Icon size={22} aria-hidden />
                  <span>{t(c)}</span>
                  <span
                    aria-hidden
                    className={cn(
                      'bg-primary absolute right-2 -bottom-3 left-2 h-0.5 rounded-full transition-opacity',
                      active ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
