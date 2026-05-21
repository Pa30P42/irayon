'use client';
// Client component: triggers Web Share API with clipboard fallback.

import { Button } from '@/components/ui/button';
import { IconShare2 } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

type ShareSaveButtonsProps = {
  shareTitle: string;
  shareText?: string;
};

export function ShareSaveButtons({ shareTitle, shareText }: ShareSaveButtonsProps) {
  const t = useTranslations('detail');

  const onShare = async () => {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return;
    const url = window.location.href;
    if ('share' in navigator) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard?.writeText(url);
    } catch {
      // No-op: best-effort fallback.
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={onShare} className="gap-1.5">
      <IconShare2 size={16} />
      {t('share')}
    </Button>
  );
}
