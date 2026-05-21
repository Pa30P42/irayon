'use client';
// Client primitive: matches the Input pattern for multi-line text.

import { cn } from '@/lib/utils';
import * as React from 'react';

type TextareaProps = React.ComponentProps<'textarea'>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        'border-border focus:ring-primary bg-background w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none',
        className,
      )}
      {...props}
    />
  );
}

export type { TextareaProps };
