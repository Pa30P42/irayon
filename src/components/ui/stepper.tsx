'use client';

import { IconMinus, IconPlus } from '@tabler/icons-react';

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

export type { StepperProps };
