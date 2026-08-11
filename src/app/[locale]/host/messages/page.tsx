import { ConversationList } from '@/components/messaging/conversation-list';
import { Heading } from '@/components/ui/typography';
import { listConversationsForUser } from '@/lib/api/conversations-service';
import { requireHostPage } from '@/lib/auth-page-guards';
import { getTranslations } from 'next-intl/server';

type PageProps = { params: Promise<{ locale: string }> };

export default async function MessagesPage({ params }: PageProps) {
  const { locale } = await params;
  const user = await requireHostPage({ locale });
  const [t, conversations] = await Promise.all([
    getTranslations({ locale, namespace: 'messages' }),
    listConversationsForUser(user.id),
  ]);

  return (
    <div className="space-y-5">
      <Heading as="h1" level="page">
        {t('title')}
      </Heading>
      <ConversationList
        conversations={conversations}
        basePath="/host/messages"
        locale={locale}
        emptyBody={t('emptyHost')}
      />
    </div>
  );
}
