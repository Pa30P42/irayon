'use client';

import { cn } from '@/lib/utils';
import type { LocaleTab } from './listing-form-labels';

type Props = {
  active: LocaleTab;
  onChange: (next: LocaleTab) => void;
};

export function ListingFormLocaleTabs({ active, onChange }: Props) {
  return (
    <div className="border-border inline-flex gap-1 rounded-lg border p-1" role="tablist">
      {(['en', 'ru', 'az'] as const).map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={active === t}
          onClick={() => onChange(t)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium uppercase transition-colors',
            active === t ? 'bg-primary text-white' : 'text-foreground-muted hover:bg-accent',
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
