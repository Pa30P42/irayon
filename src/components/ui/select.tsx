'use client';
// Client primitive: native select wrapper with consistent styling.

import { cn } from '@/lib/utils';
import * as React from 'react';

type SelectProps = React.ComponentProps<'select'>;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'bg-background h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export type { SelectProps };
