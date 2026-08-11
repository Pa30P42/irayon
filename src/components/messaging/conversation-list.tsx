import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Link } from '@/i18n/navigation';
import type { ConversationSummary } from '@/lib/api/conversations-service';
import type { Route } from 'next';
import { getTranslations } from 'next-intl/server';

/**
 * Thread list, shared by both cabinets. `basePath` is the only difference —
 * a guest's threads live under /account/messages, a host's under
 * /host/messages, and the rows are otherwise identical.
 */
export async function ConversationList({
  conversations,
  basePath,
  locale,
  emptyBody,
}: {
  conversations: ConversationSummary[];
  basePath: '/account/messages' | '/host/messages';
  locale: string;
  emptyBody: string;
}) {
  const t = await getTranslations({ locale, namespace: 'messages' });

  if (conversations.length === 0) {
    return <EmptyState title={t('empty')} description={emptyBody} />;
  }

  return (
    <ul className="space-y-2">
      {conversations.map((conversation) => (
        <li key={conversation.id}>
          <Link
            href={`${basePath}/${conversation.id}` as Route}
            className="border-border hover:bg-accent flex items-center justify-between gap-3 rounded-xl border p-4"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">
                {conversation.otherParty.name ?? t('threadWith')}
              </span>
              <span className="text-foreground-muted block truncate text-sm">
                {conversation.listing.title} · {conversation.checkIn} → {conversation.checkOut}
              </span>
            </span>
            {conversation.unread ? <Badge variant="solid">•</Badge> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
