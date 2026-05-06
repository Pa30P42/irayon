'use client';
// Client primitive: Radix popover uses portals and event handlers.

import { cn } from '@/lib/utils';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as React from 'react';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

type ContentProps = React.ComponentProps<typeof PopoverPrimitive.Content>;

export function PopoverContent({
  className,
  align = 'center',
  sideOffset = 6,
  ...props
}: ContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'bg-background z-50 w-72 rounded-md border border-[var(--color-border)] p-4 shadow-md outline-none',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
