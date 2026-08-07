'use client';

import { Button } from '@/components/ui/button';
import { useTrackCall } from '@/hooks/use-track-call';
import { cn } from '@/lib/utils';
import { IconPhone } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

type CallButtonProps = {
  listingId: string;
  /** Nullable: legacy rows may have no phone. The button hides itself then. */
  phone: string | null;
  source?: 'detail' | 'card';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

export function CallButton({
  listingId,
  phone,
  source = 'detail',
  className,
  size = 'lg',
}: CallButtonProps) {
  const t = useTranslations('listings');
  const trackCall = useTrackCall();

  // A NULL phone would render a broken `tel:` link — hide the CTA instead.
  if (!phone) return null;

  const onClick = () => {
    // Fire-and-forget — analytics must never block the call action, so we
    // ignore the mutation result and any error.
    trackCall.mutate({ listingId, source });
  };

  return (
    <Button asChild size={size} className={cn('w-full', className)}>
      <a href={`tel:${phone}`} onClick={onClick} aria-label={t('call')}>
        <IconPhone size={18} aria-hidden />
        <span>{t('call')}</span>
      </a>
    </Button>
  );
}
