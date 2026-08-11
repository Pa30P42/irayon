import { Button, Text } from '@react-email/components';
import { emailStrings, type EmailLocale } from '../email-strings';
import { EmailLayout, button, heading, paragraph } from './email-layout';

export type ListingApprovedData = {
  listingTitle: string;
  listingUrl: string;
  recipientName?: string | null | undefined;
};

export function ListingApprovedEmail({
  locale,
  data,
}: {
  locale: EmailLocale;
  data: ListingApprovedData;
}) {
  const t = emailStrings(locale).listingApproved;
  return (
    <EmailLayout locale={locale} preview={t.heading} recipientName={data.recipientName}>
      <Text style={heading}>{t.heading}</Text>
      <Text style={paragraph}>{t.body}</Text>
      <Text style={paragraph}>
        <strong>{data.listingTitle}</strong>
      </Text>
      <Button href={data.listingUrl} style={button}>
        {t.cta}
      </Button>
    </EmailLayout>
  );
}

export const listingApprovedSubject = (locale: EmailLocale, data: ListingApprovedData): string =>
  emailStrings(locale).listingApproved.subject(data.listingTitle);
