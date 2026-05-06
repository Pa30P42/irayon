'use client';
// Client component: holds local "saved" toggle and triggers Web Share API.

import { Button } from '@/components/ui/button';
import { IconHeart, IconHeartFilled, IconShare2 } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

type ShareSaveButtonsProps = {
  shareTitle: string;
  shareText?: string;
};

export function ShareSaveButtons({ shareTitle, shareText }: ShareSaveButtonsProps) {
  const t = useTranslations('detail');
  const [saved, setSaved] = useState(false);

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
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={onShare} className="gap-1.5">
        <IconShare2 size={16} />
        {t('share')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setSaved((s) => !s)}
        aria-pressed={saved}
        className="gap-1.5"
      >
        {saved ? <IconHeartFilled size={16} className="text-rose-500" /> : <IconHeart size={16} />}
        {saved ? t('saved') : t('save')}
      </Button>
    </div>
  );
}
