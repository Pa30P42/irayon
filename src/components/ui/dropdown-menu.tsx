'use client';
// Client primitive: Radix dropdown uses portals and event handlers.

import { cn } from '@/lib/utils';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import * as React from 'react';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

type ContentProps = React.ComponentProps<typeof DropdownMenuPrimitive.Content>;

export function DropdownMenuContent({ className, sideOffset = 6, ...props }: ContentProps) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'bg-background z-50 min-w-[10rem] overflow-hidden rounded-md border border-[var(--color-border)] p-1 shadow-md',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

type ItemProps = React.ComponentProps<typeof DropdownMenuPrimitive.Item>;

export function DropdownMenuItem({ className, ...props }: ItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        'relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none focus:bg-[var(--color-accent)]',
        className,
      )}
      {...props}
    />
  );
}
