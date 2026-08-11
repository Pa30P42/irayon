import { Badge } from '@/components/ui/badge';
import type { $Enums } from '@prisma/client';
import { useTranslations } from 'next-intl';

/**
 * Moderation state, shown to the host as a badge.
 *
 * `status` (draft/published/archived) and `moderationStatus` are ORTHOGONAL —
 * a listing can be published-but-pending, or approved-but-unpublished — so both
 * are rendered rather than collapsed into one label that would have to lie
 * about one of them.
 */
export function ModerationBadge({
  moderationStatus,
  hasPendingChanges,
}: {
  moderationStatus: $Enums.ModerationStatus;
  hasPendingChanges: boolean;
}) {
  const t = useTranslations('host.moderation');

  if (hasPendingChanges && moderationStatus === 'APPROVED') {
    return <Badge variant="outline">{t('pendingChanges')}</Badge>;
  }
  switch (moderationStatus) {
    case 'PENDING':
      return <Badge>{t('pending')}</Badge>;
    case 'REJECTED':
      return <Badge variant="outline">{t('rejected')}</Badge>;
    case 'APPROVED':
      return <Badge variant="solid">{t('approved')}</Badge>;
  }
}
