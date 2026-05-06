'use client';
// Client component: holds local toggle state for favoriting a listing.

import { cn } from '@/lib/utils';
import { IconHeart, IconHeartFilled } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useState, type MouseEvent } from 'react';

type FavoriteButtonProps = {
  initial?: boolean;
  onChange?: (next: boolean) => void;
  className?: string;
};

export function FavoriteButton({ initial = false, onChange, className }: FavoriteButtonProps) {
  const [active, setActive] = useState(initial);
  const t = useTranslations('common');

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !active;
    setActive(next);
    onChange?.(next);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={active ? t('unfavorite') : t('favorite')}
      className={cn(
        'text-foreground absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none',
        className,
      )}
    >
      {active ? <IconHeartFilled size={18} className="text-rose-500" /> : <IconHeart size={18} />}
    </button>
  );
}
