'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { IconPhone } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

type CallButtonProps = {
  listingId: string;
  phone: string;
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

  const onClick = () => {
    // Fire-and-forget: keepalive lets the request survive the navigation that
    // a tel: link triggers on mobile.
    try {
      fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, source }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // swallow — analytics must never block the call action
    }
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
