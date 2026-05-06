'use client';
// Client component: reads/writes the ?category= URL state via nuqs.

import { useTranslations } from 'next-intl';
import {
  IconWorld,
  IconMountain,
  IconTrees,
  IconWaveSine,
  IconBeach,
  IconSwimming,
  IconGrillFork,
  IconSnowflake,
  IconHome,
  type Icon,
} from '@tabler/icons-react';
import { HOME_CATEGORIES } from '@/lib/constants';
import { useCategoryFilter } from '@/hooks/use-category-filter';
import { cn } from '@/lib/utils';
import type { HomeCategory } from '@/types';

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
  const { category, setCategory, isActive } = useCategoryFilter();

  return (
    <nav
      aria-label={t('all')}
      className="border-b border-border bg-background sticky top-16 z-30"
    >
      <div className="container-wide">
        <ul
          role="tablist"
          aria-label="Categories"
          className="flex gap-1 sm:gap-2 overflow-x-auto py-3 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin"
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
                    'group relative flex flex-col items-center gap-1 px-3 py-2 rounded-md text-xs font-medium text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    active && 'text-primary',
                  )}
                >
                  <Icon size={22} aria-hidden />
                  <span>{t(c)}</span>
                  <span
                    aria-hidden
                    className={cn(
                      'absolute -bottom-3 left-2 right-2 h-0.5 rounded-full bg-primary transition-opacity',
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
