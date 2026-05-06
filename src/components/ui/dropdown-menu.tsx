'use client';
// Client primitive: Radix dropdown uses portals and event handlers.

import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

type ContentProps = React.ComponentProps<typeof DropdownMenuPrimitive.Content>;

export function DropdownMenuContent({ className, sideOffset = 6, ...props }: ContentProps) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[10rem] overflow-hidden rounded-md border border-[var(--color-border)] bg-background p-1 shadow-md',
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
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-[var(--color-accent)]',
        className,
      )}
      {...props}
    />
  );
}
