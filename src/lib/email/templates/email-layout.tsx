import { Body, Container, Head, Hr, Html, Preview, Section, Text } from '@react-email/components';
import type { ReactNode } from 'react';
import { emailStrings, type EmailLocale } from '../email-strings';

/**
 * Shared chrome for every transactional email: greeting, sign-off, footer.
 * Inline styles only — email clients strip <style> blocks and know nothing
 * about Tailwind.
 */
export function EmailLayout({
  locale,
  preview,
  recipientName,
  children,
}: {
  locale: EmailLocale;
  preview: string;
  recipientName?: string | null | undefined;
  children: ReactNode;
}) {
  const t = emailStrings(locale).common;
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={brand}>irayon</Text>
          <Text style={paragraph}>
            {t.greeting}
            {recipientName ? `, ${recipientName}` : ''}!
          </Text>
          <Section>{children}</Section>
          <Text style={paragraph}>{t.signOff}</Text>
          <Hr style={hr} />
          <Text style={footer}>{t.footerNote}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: '#f6f6f4',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  padding: '24px 0',
};

const container = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  margin: '0 auto',
  maxWidth: '560px',
  padding: '32px',
};

const brand = {
  color: '#1f6f4a',
  fontSize: '20px',
  fontWeight: 700,
  letterSpacing: '-0.01em',
  margin: '0 0 24px',
};

export const paragraph = {
  color: '#1a1a1a',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

export const heading = {
  color: '#111111',
  fontSize: '20px',
  fontWeight: 600,
  lineHeight: '28px',
  margin: '0 0 12px',
};

export const button = {
  backgroundColor: '#1f6f4a',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: 600,
  padding: '12px 20px',
  textDecoration: 'none',
};

export const quote = {
  borderLeft: '3px solid #d8d8d4',
  color: '#444444',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 16px',
  padding: '4px 0 4px 12px',
};

const hr = { borderColor: '#e6e6e2', margin: '24px 0 16px' };

const footer = { color: '#8a8a85', fontSize: '12px', lineHeight: '18px', margin: 0 };
