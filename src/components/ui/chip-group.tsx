'use client';

import { cn } from '@/lib/utils';

type ChipOption<T extends string> = {
  value: T;
  label: string;
};

type ChipGroupProps<T extends string> = {
  options: readonly ChipOption<T>[];
  selected: readonly T[];
  onChange: (next: T[]) => void;
  ariaLabel: string;
  /** When true, behaves like radio (single value), not multi-select. */
  single?: boolean;
};

export function ChipGroup<T extends string>({
  options,
  selected,
  onChange,
  ariaLabel,
  single,
}: ChipGroupProps<T>) {
  const toggle = (value: T) => {
    if (single) {
      onChange([value]);
      return;
    }
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(opt.value)}
            className={cn(
              'border-border rounded-full border px-3.5 py-1.5 text-sm transition-colors',
              active
                ? 'border-primary bg-primary text-white'
                : 'hover:bg-accent text-foreground bg-background',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export type { ChipGroupProps, ChipOption };
