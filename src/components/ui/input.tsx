'use client';
// Client primitive: form input that handles change events.

import { cn } from '@/lib/utils';
import * as React from 'react';

type InputProps = React.ComponentProps<'input'>;

export function Input({ className, type = 'text', ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        'bg-background placeholder:text-foreground-muted h-10 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export type { InputProps };
