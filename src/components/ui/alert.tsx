// Alert / banner primitive. Three tones (error, warning, success) and three
// sizes that match the recurring patterns across the admin UI.

import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const alertVariants = cva('flex items-start border', {
  variants: {
    variant: {
      error: 'border-rose-200 bg-rose-50 text-rose-800',
      warning: 'border-amber-200 bg-amber-50 text-amber-800',
      success: 'border-primary/30 bg-accent text-primary',
    },
    size: {
      sm: 'gap-2 rounded-md px-3 py-2 text-xs',
      md: 'gap-2 rounded-lg px-4 py-3 text-sm',
      lg: 'gap-3 rounded-xl px-4 py-3 text-sm',
    },
  },
  defaultVariants: { variant: 'error', size: 'md' },
});

type AlertProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>;

export function Alert({ className, variant, size, ...props }: AlertProps) {
  return (
    <div role="alert" className={cn(alertVariants({ variant, size }), className)} {...props} />
  );
}

const alertTextVariants = cva('block rounded-md border', {
  variants: {
    variant: {
      error: 'border-rose-200 bg-rose-50 text-rose-700',
      warning: 'border-amber-200 bg-amber-50 text-amber-800',
      success: 'border-primary/30 bg-accent text-primary',
    },
  },
  defaultVariants: { variant: 'error' },
});

type AlertTextProps = React.HTMLAttributes<HTMLParagraphElement> &
  VariantProps<typeof alertTextVariants>;

/**
 * Standalone text alert — no icon, no flex layout. Used in dialogs where a
 * short error/warning paragraph appears below the dialog body.
 */
export function AlertText({ className, variant, ...props }: AlertTextProps) {
  return (
    <p className={cn(alertTextVariants({ variant }), 'px-3 py-2 text-xs', className)} {...props} />
  );
}

export { alertTextVariants, alertVariants };
export type { AlertProps, AlertTextProps };
