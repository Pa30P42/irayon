'use client';
// Mobile-friendly form primitives shared by the admin form.

import { cn } from '@/lib/utils';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import type { ReactNode } from 'react';

type FieldProps = {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
};

export function Field({ label, required, hint, error, htmlFor, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>
      {children}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {!error && hint ? <p className="text-foreground-muted text-xs">{hint}</p> : null}
    </div>
  );
}

type SectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="border-border bg-background rounded-2xl border p-5 shadow-sm sm:p-6">
      <header className="mb-4">
        <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
        {description ? <p className="text-foreground-muted mt-1 text-sm">{description}</p> : null}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

type StepperProps = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel: string;
};

/** Mobile-friendly numeric stepper with explicit +/− buttons. */
export function Stepper({ value, onChange, min = 0, max = 99, step = 1, ariaLabel }: StepperProps) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  return (
    <div
      className="border-border inline-flex items-center gap-1 rounded-md border p-1"
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        className="hover:bg-accent grid h-9 w-9 place-items-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Decrease"
      >
        <IconMinus size={16} />
      </button>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) onChange(Math.max(min, Math.min(max, next)));
        }}
        className="w-14 bg-transparent text-center text-base tabular-nums focus:outline-none"
        inputMode="numeric"
      />
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        className="hover:bg-accent grid h-9 w-9 place-items-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Increase"
      >
        <IconPlus size={16} />
      </button>
    </div>
  );
}

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
