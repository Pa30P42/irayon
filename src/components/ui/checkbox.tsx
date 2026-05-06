'use client';
// Client primitive: Radix checkbox handles state changes.

import { cn } from '@/lib/utils';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { IconCheck } from '@tabler/icons-react';
import * as React from 'react';

type CheckboxProps = React.ComponentProps<typeof CheckboxPrimitive.Root>;

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary peer h-5 w-5 shrink-0 rounded-sm border bg-white transition-colors',
        'focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        <IconCheck size={14} strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export type { CheckboxProps };
