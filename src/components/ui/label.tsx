'use client';
// Client primitive: wraps Radix's accessible Label.

import { cn } from '@/lib/utils';
import * as LabelPrimitive from '@radix-ui/react-label';
import * as React from 'react';

type LabelProps = React.ComponentProps<typeof LabelPrimitive.Root>;

export function Label({ className, ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root className={cn('text-sm leading-none font-medium', className)} {...props} />
  );
}

export type { LabelProps };
