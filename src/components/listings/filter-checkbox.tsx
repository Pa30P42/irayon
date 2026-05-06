'use client';
// Headless-friendly: no internal state. Parent owns checked, disabled, count.

import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

type FilterCheckboxProps = {
  id: string;
  label: string;
  checked: boolean;
  count?: number;
  /** Incompatible (would yield 0 results). Renders strikethrough + non-interactive. */
  incompatible?: boolean;
  onChange: (next: boolean) => void;
};

export function FilterCheckbox({
  id,
  label,
  checked,
  count,
  incompatible = false,
  onChange,
}: FilterCheckboxProps) {
  const disabled = incompatible && !checked;
  const displayCount = incompatible && !checked ? 0 : count;

  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-center gap-3 py-1.5 text-sm select-none',
        disabled && 'cursor-not-allowed opacity-40',
      )}
      data-incompatible={disabled || undefined}
    >
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <span className={cn('flex-1', disabled && 'line-through')}>{label}</span>
      {typeof displayCount === 'number' ? (
        <span className="text-foreground-muted text-xs tabular-nums">{displayCount}</span>
      ) : null}
    </label>
  );
}
