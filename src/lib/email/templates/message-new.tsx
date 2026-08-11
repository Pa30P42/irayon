import { Button, Text } from '@react-email/components';
import { emailStrings, type EmailLocale } from '../email-strings';
import { EmailLayout, button, heading, paragraph } from './email-layout';

export type MessageNewData = {
  listingTitle: string;
  actionUrl: string;
  recipientName?: string | null | undefined;
};

/**
 * Deliberately does NOT include the message body.
 *
 * Two reasons. Private correspondence shouldn't be duplicated into an inbox we
 * don't control, and a body in the email removes the reason to open the thread
 * — where the read cursor moves and the debounce resets.
 */
export function MessageNewEmail({ locale, data }: { locale: EmailLocale; data: MessageNewData }) {
  const t = emailStrings(locale).messageNew;
  return (
    <EmailLayout locale={locale} preview={t.heading} recipientName={data.recipientName}>
      <Text style={heading}>{t.heading}</Text>
      <Text style={paragraph}>{t.body}</Text>
      <Text style={paragraph}>
        <strong>{data.listingTitle}</strong>
      </Text>
      <Button href={data.actionUrl} style={button}>
        {t.cta}
      </Button>
    </EmailLayout>
  );
}

export const messageNewSubject = (locale: EmailLocale, data: MessageNewData): string =>
  emailStrings(locale).messageNew.subject(data.listingTitle);
