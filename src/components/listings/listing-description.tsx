'use client';
// Client component: holds the show-more toggle and measures whether truncation is needed.

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

type ListingDescriptionProps = {
  description: string;
};

const TRUNCATE_AT = 320;

export function ListingDescription({ description }: ListingDescriptionProps) {
  const t = useTranslations('detail.description');
  const [expanded, setExpanded] = useState(false);

  const needsTruncation = description.length > TRUNCATE_AT;
  const visible =
    !needsTruncation || expanded ? description : description.slice(0, TRUNCATE_AT).trimEnd() + '…';

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{t('title')}</h2>
      <p className={cn('text-foreground leading-relaxed whitespace-pre-line')}>{visible}</p>
      {needsTruncation ? (
        <Button
          variant="link"
          size="sm"
          className="px-0 underline-offset-4"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? t('showLess') : t('showMore')}
        </Button>
      ) : null}
    </section>
  );
}
