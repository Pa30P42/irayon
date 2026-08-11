'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useApproveListing, useRejectListing } from '@/hooks/use-moderate-listing';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const MIN_REASON_LENGTH = 10;

export function ModerationActions({ listingId }: { listingId: string }) {
  const t = useTranslations('admin.moderation');
  const router = useRouter();
  const approve = useApproveListing();
  const reject = useRejectListing();

  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const busy = approve.isPending || reject.isPending;

  const onApprove = () => {
    setError(null);
    approve.mutate(
      { listingId },
      {
        onSuccess: () => router.refresh(),
        onError: (err) => {
          // The server refuses an approval that would leave the listing with no
          // photos. Translate that into guidance ("reject instead") rather than
          // echoing an error code at the moderator.
          setError(
            err.message === 'approval_would_empty_images'
              ? t('wouldEmptyImages')
              : err.message || t('approveFailed'),
          );
        },
      },
    );
  };

  const onReject = () => {
    if (reason.trim().length < MIN_REASON_LENGTH) return;
    setError(null);
    reject.mutate(
      { listingId, reason: reason.trim() },
      {
        onSuccess: () => {
          setRejecting(false);
          setReason('');
          router.refresh();
        },
        onError: (err) => setError(err.message),
      },
    );
  };

  return (
    <div className="space-y-2">
      {error ? (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      ) : null}

      {rejecting ? (
        <div className="space-y-2">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('rejectReason')}
            rows={3}
            aria-label={t('rejectReason')}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy || reason.trim().length < MIN_REASON_LENGTH}
              onClick={onReject}
            >
              {t('rejectSubmit')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                setRejecting(false);
                setError(null);
              }}
            >
              {t('cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={onApprove}>
            {t('approve')}
          </Button>
          <Button
            type="button"
            variant="destructiveGhost"
            size="sm"
            disabled={busy}
            onClick={() => setRejecting(true)}
          >
            {t('reject')}
          </Button>
        </div>
      )}
    </div>
  );
}
