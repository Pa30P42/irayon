'use client';
// Client component: reads/writes URL query params via nuqs.

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useFilters } from '@/hooks/use-filters';
import { CATEGORIES } from '@/lib/constants';
import type { ListingCategory } from '@/types';
import { useTranslations } from 'next-intl';

export function ListingFiltersBar() {
  const t = useTranslations('categories');
  const tCommon = useTranslations('common');
  const { filters, setFilters, reset } = useFilters();

  return (
    <div className="mb-6 flex flex-wrap items-end gap-4">
      <div className="min-w-[180px] flex-1">
        <Label htmlFor="category" className="mb-1 block">
          {tCommon('filter')}
        </Label>
        <Select
          id="category"
          value={filters.category ?? ''}
          onChange={(e) =>
            setFilters({
              category: e.target.value === '' ? null : (e.target.value as ListingCategory),
            })
          }
        >
          <option value="">—</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(c)}
            </option>
          ))}
        </Select>
      </div>
      <Button variant="outline" onClick={reset}>
        Reset
      </Button>
    </div>
  );
}
