'use client';
// Client primitive: Radix dialog uses portals and event handlers.

import { cn } from '@/lib/utils';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { IconX } from '@tabler/icons-react';
import * as React from 'react';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

type OverlayProps = React.ComponentProps<typeof DialogPrimitive.Overlay>;
export function DialogOverlay({ className, ...props }: OverlayProps) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
        className,
      )}
      {...props}
    />
  );
}

type ContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
  hideClose?: boolean;
};

export function DialogContent({ className, children, hideClose, ...props }: ContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'bg-background fixed top-1/2 left-1/2 z-50 flex max-h-[100dvh] w-full -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden border-none shadow-2xl outline-none',
          'sm:max-h-[90vh] sm:max-w-3xl sm:rounded-2xl',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'h-[100dvh] sm:h-auto',
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            aria-label="Close"
            className="hover:bg-accent absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
          >
            <IconX size={18} />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'border-border flex flex-col gap-1 border-b px-6 py-4 text-center sm:text-left',
        className,
      )}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'border-border bg-background sticky bottom-0 flex items-center justify-between gap-3 border-t px-6 py-4',
        className,
      )}
      {...props}
    />
  );
}

export const DialogTitle = (props: React.ComponentProps<typeof DialogPrimitive.Title>) => (
  <DialogPrimitive.Title {...props} className={cn('text-lg font-semibold', props.className)} />
);

export const DialogDescription = (
  props: React.ComponentProps<typeof DialogPrimitive.Description>,
) => (
  <DialogPrimitive.Description
    {...props}
    className={cn('text-foreground-muted text-sm', props.className)}
  />
);
