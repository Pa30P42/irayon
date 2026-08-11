import { render } from '@react-email/render';
import type { ReactElement } from 'react';
import { toEmailLocale, type EmailLocale } from './email-strings';
import {
  BookingUpdateEmail,
  bookingUpdateSubject,
  type BookingEmailData,
} from './templates/booking-update';
import {
  ListingApprovedEmail,
  listingApprovedSubject,
  type ListingApprovedData,
} from './templates/listing-approved';
import {
  ListingRejectedEmail,
  listingRejectedSubject,
  type ListingRejectedData,
} from './templates/listing-rejected';

/**
 * Transactional email.
 *
 * **Email is never the system of record.** Every notification is written as a
 * `Notification` row first (in the same transaction as the state change it
 * describes); this module is a best-effort layer on top. Always call it inside
 * `after()` so a slow or failing provider can't extend the request.
 *
 * Driver resolution happens once, from env:
 *   `EMAIL_DRIVER ?? (RESEND_API_KEY ? 'resend' : 'log')`
 *
 * With neither variable set the driver is `log` and every message is printed
 * as a structured line — which is exactly what makes the whole marketplace
 * runnable before Resend is connected.
 */

export type EmailDriver = 'resend' | 'log';

/**
 * Template + its data, as one discriminated union: adding a template without
 * its payload (or vice versa) is a typecheck failure, not a runtime surprise.
 */
export type EmailPayload =
  | { template: 'listing-approved'; data: ListingApprovedData }
  | { template: 'listing-rejected'; data: ListingRejectedData }
  | { template: 'booking-update'; data: BookingEmailData };

export type SendEmailInput = EmailPayload & {
  to: string;
  /** The RECIPIENT's preferred locale — never the requesting user's. */
  locale: string | null | undefined;
};

export type SendEmailResult = {
  delivered: boolean;
  driver: EmailDriver;
  /** Provider message id when the driver actually sent something. */
  id?: string;
};

/** `next build` runs with NODE_ENV=production but must never require a key. */
const isBuildPhase = (): boolean => process.env.NEXT_PHASE === 'phase-production-build';

export function resolveEmailDriver(): EmailDriver {
  const explicit = process.env.EMAIL_DRIVER;
  if (explicit === 'resend' || explicit === 'log') return explicit;
  return process.env.RESEND_API_KEY ? 'resend' : 'log';
}

/**
 * A production deployment that quietly resolves to `log` sends nothing, fails
 * nothing, and produces no signal — every "your listing was approved" message
 * goes to stdout. Refuse loudly instead.
 *
 * Checked here, at first send, NOT at module load: a load-time throw would
 * fail `pnpm build:ci`, which builds without the key by design. An explicit
 * `EMAIL_DRIVER=log` remains available as a deliberate incident-time mute — it
 * just can no longer happen by omission.
 */
function assertDriverIsIntentional(driver: EmailDriver): void {
  if (driver !== 'log') return;
  if (process.env.NODE_ENV !== 'production') return;
  if (isBuildPhase()) return;
  if (process.env.EMAIL_DRIVER === 'log') return;
  throw new Error(
    'Email driver resolved to "log" in production: RESEND_API_KEY is missing. ' +
      'Set RESEND_API_KEY, or set EMAIL_DRIVER=log explicitly to mute email on purpose.',
  );
}

function renderPayload(
  payload: EmailPayload,
  locale: EmailLocale,
): { subject: string; element: ReactElement } {
  switch (payload.template) {
    case 'listing-approved':
      return {
        subject: listingApprovedSubject(locale, payload.data),
        element: <ListingApprovedEmail locale={locale} data={payload.data} />,
      };
    case 'listing-rejected':
      return {
        subject: listingRejectedSubject(locale, payload.data),
        element: <ListingRejectedEmail locale={locale} data={payload.data} />,
      };
    case 'booking-update':
      return {
        subject: bookingUpdateSubject(locale, payload.data),
        element: <BookingUpdateEmail locale={locale} data={payload.data} />,
      };
  }
}

/** Single-line JSON so a log aggregator can alert on email delivery failures. */
function logEmailEvent(event: Record<string, unknown>): void {
  console.warn(JSON.stringify({ at: new Date().toISOString(), ...event }));
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const driver = resolveEmailDriver();
  assertDriverIsIntentional(driver);

  const locale = toEmailLocale(input.locale);
  const { subject, element } = renderPayload(input, locale);

  if (driver === 'log') {
    const text = await render(element, { plainText: true });
    logEmailEvent({
      type: 'email_logged',
      driver: 'log',
      to: input.to,
      template: input.template,
      locale,
      subject,
      body: text,
    });
    return { delivered: false, driver: 'log' };
  }

  const from = process.env.EMAIL_FROM;
  if (!from) {
    logEmailEvent({
      type: 'email_send_failed',
      driver,
      to: input.to,
      template: input.template,
      error: 'EMAIL_FROM is not set',
    });
    return { delivered: false, driver };
  }

  const html = await render(element);
  const text = await render(element, { plainText: true });

  try {
    // Imported lazily so the SDK never loads on the `log` path (dev, CI, and
    // any deployment that hasn't connected Resend yet).
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from,
      to: input.to,
      subject,
      html,
      text,
    });

    if (error) {
      logEmailEvent({
        type: 'email_send_failed',
        driver,
        to: input.to,
        template: input.template,
        error: error.message ?? String(error),
      });
      return { delivered: false, driver };
    }

    return { delivered: true, driver, ...(data?.id ? { id: data.id } : {}) };
  } catch (err) {
    logEmailEvent({
      type: 'email_send_failed',
      driver,
      to: input.to,
      template: input.template,
      error: err instanceof Error ? err.message : String(err),
    });
    return { delivered: false, driver };
  }
}
