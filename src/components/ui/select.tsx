'use client';
// Client primitive: native select wrapper with consistent styling.

import * as React from 'react';
import { cn } from '@/lib/utils';

type SelectProps = React.ComponentProps<'select'>;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'h-10 w-full rounded-md border border-[var(--color-border)] bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export type { SelectProps };
