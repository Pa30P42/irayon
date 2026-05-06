import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number, locale: string = 'az'): string {
  const formatter = new Intl.NumberFormat(localeToBcp47(locale), {
    style: 'decimal',
    maximumFractionDigits: 0,
  });
  return formatter.format(amount);
}

export function localeToBcp47(locale: string): string {
  switch (locale) {
    case 'az':
      return 'az-AZ';
    case 'ru':
      return 'ru-RU';
    case 'en':
      return 'en-US';
    default:
      return 'en-US';
  }
}

/**
 * Pretty-print an E.164 number for the Azerbaijani convention used in MVP
 * data: `+994501110001` → `+994 50 111 00 01`. Falls back to the raw input
 * for any other format so we never hide a usable number behind cosmetics.
 */
export function formatPhoneNumber(phone: string): string {
  const match = phone.match(/^\+994(\d{2})(\d{3})(\d{2})(\d{2})$/);
  if (!match) return phone;
  const [, op, a, b, c] = match;
  return `+994 ${op} ${a} ${b} ${c}`;
}

export function pickLocalized<T extends Record<string, string>>(
  text: T,
  locale: keyof T,
  fallback: keyof T = 'en' as keyof T,
): string {
  return text[locale] ?? text[fallback] ?? '';
}
