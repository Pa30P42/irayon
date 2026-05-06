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

export function pickLocalized<T extends Record<string, string>>(
  text: T,
  locale: keyof T,
  fallback: keyof T = 'en' as keyof T,
): string {
  return text[locale] ?? text[fallback] ?? '';
}
