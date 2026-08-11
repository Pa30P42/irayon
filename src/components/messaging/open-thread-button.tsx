'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import type { Route } from 'next';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

/**
 * Opens (creating if needed) the thread for a booking, then navigates to it.
 *
 * A button rather than a link because the conversation may not exist yet —
 * threads are created lazily, so the id isn't known until the server says so.
 */
export function OpenThreadButton({
  bookingId,
  basePath,
}: {
  bookingId: string;
  basePath: '/account/messages' | '/host/messages';
}) {
  const t = useTranslations('messages');
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/conversation`, {
        method: 'POST',
      });
      if (!res.ok) return;
      const { id } = (await res.json()) as { id: string };
      router.push(`${basePath}/${id}` as Route);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" size="sm" disabled={busy} onClick={onClick}>
      {t('openThread')}
    </Button>
  );
}
