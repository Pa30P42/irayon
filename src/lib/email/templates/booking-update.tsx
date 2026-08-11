import { Button, Text } from '@react-email/components';
import {
  bookingEmailStrings,
  bookingLabels,
  type BookingEmailKind,
  type EmailLocale,
} from '../email-strings';
import { EmailLayout, button, heading, paragraph, quote } from './email-layout';

export type BookingEmailData = {
  kind: BookingEmailKind;
  listingTitle: string;
  /** `YYYY-MM-DD`. */
  checkIn: string;
  checkOut: string;
  guestCount: number;
  /**
   * The SNAPSHOT total, as agreed when the request was made — never the
   * listing's current pricing. See `booking-dto.ts`.
   */
  total: number;
  currency: string;
  /** Decline or cancellation reason, when one was given. */
  reason?: string | null | undefined;
  actionUrl: string;
  recipientName?: string | null | undefined;
};

/**
 * One component for every booking notification, parameterised by `kind`.
 *
 * Five near-identical template files would drift in layout the first time one
 * of them was tweaked, and the layout is the part that must stay consistent —
 * only the wording differs.
 */
export function BookingUpdateEmail({
  locale,
  data,
}: {
  locale: EmailLocale;
  data: BookingEmailData;
}) {
  const t = bookingEmailStrings(locale, data.kind);
  const labels = bookingLabels(locale);

  return (
    <EmailLayout locale={locale} preview={t.heading} recipientName={data.recipientName}>
      <Text style={heading}>{t.heading}</Text>
      <Text style={paragraph}>{t.body}</Text>
      <Text style={paragraph}>
        <strong>{data.listingTitle}</strong>
      </Text>
      <Text style={paragraph}>
        {labels.dates}: {data.checkIn} → {data.checkOut}
        <br />
        {labels.guests}: {data.guestCount}
        <br />
        {labels.total}: {data.total} {data.currency}
      </Text>
      {data.reason ? (
        <>
          <Text style={paragraph}>{labels.reason}:</Text>
          {/* Plain text node — a host's reason is untrusted input and is never
              rendered as HTML. */}
          <Text style={quote}>{data.reason}</Text>
        </>
      ) : null}
      <Button href={data.actionUrl} style={button}>
        {t.cta}
      </Button>
    </EmailLayout>
  );
}

export const bookingUpdateSubject = (locale: EmailLocale, data: BookingEmailData): string =>
  bookingEmailStrings(locale, data.kind).subject(data.listingTitle);
