import { MessageThread } from '@/components/messaging/message-thread';
import { Heading } from '@/components/ui/typography';
import { Link } from '@/i18n/navigation';
import { findConversationById, participantRole } from '@/lib/api/conversations-service';
import { parseLocalized } from '@/lib/api/localized-text';
import { requireHostPage } from '@/lib/auth-page-guards';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

type PageProps = { params: Promise<{ locale: string; id: string }> };

export default async function MessageThreadPage({ params }: PageProps) {
  const { locale, id } = await params;
  const user = await requireHostPage({ locale });

  const conversation = await findConversationById(id);
  // Participation is re-derived here as well as in the API. A page that
  // rendered the shell before the API refused would leak the listing title and
  // the other party's name.
  if (!conversation || !participantRole(conversation, user.id)) notFound();

  const t = await getTranslations({ locale, namespace: 'messages' });
  const role = participantRole(conversation, user.id);
  const other = role === 'guest' ? conversation.booking.listing.host : conversation.booking.guest;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/host/messages" className="text-foreground-muted text-sm hover:underline">
        ← {t('backToList')}
      </Link>
      <header className="space-y-1">
        <Heading as="h1" level="compact">
          {other?.name ?? t('threadWith')}
        </Heading>
        <p className="text-foreground-muted text-sm">
          {parseLocalized(conversation.booking.listing.title).en} ·{' '}
          {conversation.booking.checkIn.toISOString().slice(0, 10)} →{' '}
          {conversation.booking.checkOut.toISOString().slice(0, 10)}
        </p>
      </header>
      <MessageThread conversationId={id} />
    </div>
  );
}
