'use client';

import { useFilterCompatibility } from '@/hooks/use-filter-compatibility';
import { isOptionSelected } from '@/lib/listings-filter';
import type { FilterCompatibility, FilterGroupName, Listing, ListingsFilterState } from '@/types';
import { FilterCheckbox } from './filter-checkbox';

type FilterGroupProps = {
  title: string;
  group: FilterGroupName;
  options: readonly string[];
  /** Localized label for each option key. */
  labelFor: (option: string) => string;
  state: ListingsFilterState;
  listings: Listing[];
  onToggle: (option: string) => void;
  /** Optional override of compatibility/count — used in tests or when computed externally. */
  compatibility?: FilterCompatibility;
};

export function FilterGroup({
  title,
  group,
  options,
  labelFor,
  state,
  listings,
  onToggle,
  compatibility,
}: FilterGroupProps) {
  const computed = useFilterCompatibility({ listings, state, group, options });
  const compat = compatibility ?? computed;

  return (
    <fieldset className="grid grid-cols-1 gap-1 sm:grid-cols-2">
      <legend className="col-span-full mb-2 text-sm font-semibold">{title}</legend>
      {options.map((opt) => {
        const checked = isOptionSelected(state, group, opt);
        const info = compat[opt];
        return (
          <FilterCheckbox
            key={opt}
            id={`${group}-${opt}`}
            label={labelFor(opt)}
            checked={checked}
            count={info?.count}
            incompatible={info ? !info.compatible : false}
            onChange={() => onToggle(opt)}
          />
        );
      })}
    </fieldset>
  );
}
