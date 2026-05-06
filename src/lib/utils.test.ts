import { describe, expect, it } from 'vitest';
import { cn, formatPrice, localeToBcp47, pickLocalized } from './utils';

describe('cn', () => {
  it('merges class names and resolves tailwind conflicts', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-sm', false && 'hidden', 'font-bold')).toBe('text-sm font-bold');
  });
});

describe('formatPrice', () => {
  it('formats integers without fractional digits', () => {
    expect(formatPrice(320, 'en')).toBe('320');
    expect(formatPrice(1500, 'en')).toMatch(/1.500|1,500/);
  });
});

describe('localeToBcp47', () => {
  it.each([
    ['az', 'az-AZ'],
    ['ru', 'ru-RU'],
    ['en', 'en-US'],
    ['xx', 'en-US'],
  ])('maps %s to %s', (input, expected) => {
    expect(localeToBcp47(input)).toBe(expected);
  });
});

describe('pickLocalized', () => {
  it('returns the value for the locale or falls back', () => {
    const text = { az: 'A', ru: 'R', en: 'E' };
    expect(pickLocalized(text, 'az')).toBe('A');
    expect(pickLocalized(text, 'en')).toBe('E');
  });
});
