// Typography primitives. One file to edit when an app-wide size/weight changes.
// Color is intentionally left out of the base so context (dark hero, footer
// muted, error banner) can choose its own; pass `text-*` via className.

import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const headingVariants = cva('tracking-tight', {
  variants: {
    level: {
      hero: 'text-4xl font-bold md:text-6xl',
      detail: 'text-3xl font-semibold md:text-4xl',
      page: 'text-2xl font-semibold sm:text-3xl',
      section: 'text-2xl font-semibold md:text-3xl',
      subsection: 'text-xl font-semibold',
      adminSubsection: 'text-base font-semibold sm:text-lg',
      compact: 'text-xl font-semibold sm:text-2xl',
      small: 'text-lg font-semibold',
      tiny: 'text-base font-semibold',
      column: 'text-sm font-semibold',
      errorTitle: 'text-2xl font-semibold',
      notFoundTitle: 'text-3xl font-semibold',
    },
  },
  defaultVariants: { level: 'section' },
});

type HeadingProps = React.HTMLAttributes<HTMLHeadingElement> &
  VariantProps<typeof headingVariants> & {
    as?: 'h1' | 'h2' | 'h3' | 'h4';
  };

export function Heading({ as: As = 'h2', level, className, ...props }: HeadingProps) {
  return <As className={cn(headingVariants({ level }), className)} {...props} />;
}

const cardTitleVariants = cva('font-medium', {
  variants: {
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    },
  },
  defaultVariants: { size: 'md' },
});

type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement> &
  VariantProps<typeof cardTitleVariants> & {
    as?: 'h2' | 'h3' | 'h4';
  };

export function CardTitle({ as: As = 'h3', size, className, ...props }: CardTitleProps) {
  return <As className={cn(cardTitleVariants({ size }), className)} {...props} />;
}

export function BodyText(props: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} className={cn('text-base', props.className)} />;
}

export function Caption(props: React.HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className={cn('text-foreground-muted text-xs', props.className)} />;
}

type EyebrowProps = React.HTMLAttributes<HTMLElement> & {
  as?: 'span' | 'h2' | 'h3' | 'h4' | 'div';
};

export function Eyebrow({ as: As = 'span', className, ...props }: EyebrowProps) {
  return (
    <As
      {...props}
      className={cn(
        'text-foreground-muted text-sm font-semibold tracking-wide uppercase',
        className,
      )}
    />
  );
}

export { cardTitleVariants, headingVariants };
export type { CardTitleProps, HeadingProps };
