import { Button, Text } from '@react-email/components';
import { emailStrings, type EmailLocale } from '../email-strings';
import { EmailLayout, button, heading, paragraph, quote } from './email-layout';

export type ListingRejectedData = {
  listingTitle: string;
  reason: string;
  editUrl: string;
  recipientName?: string | null | undefined;
};

export function ListingRejectedEmail({
  locale,
  data,
}: {
  locale: EmailLocale;
  data: ListingRejectedData;
}) {
  const t = emailStrings(locale).listingRejected;
  return (
    <EmailLayout locale={locale} preview={t.heading} recipientName={data.recipientName}>
      <Text style={heading}>{t.heading}</Text>
      <Text style={paragraph}>{t.body}</Text>
      <Text style={paragraph}>
        <strong>{data.listingTitle}</strong>
      </Text>
      <Text style={paragraph}>{t.reasonLabel}:</Text>
      {/* Plain text node — the moderator's note is untrusted input and is never
          rendered as HTML. */}
      <Text style={quote}>{data.reason}</Text>
      <Button href={data.editUrl} style={button}>
        {t.cta}
      </Button>
    </EmailLayout>
  );
}

export const listingRejectedSubject = (locale: EmailLocale, data: ListingRejectedData): string =>
  emailStrings(locale).listingRejected.subject(data.listingTitle);
