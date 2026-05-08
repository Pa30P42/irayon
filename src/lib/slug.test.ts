import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug } from './slug';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Gabala Pine Retreat')).toBe('gabala-pine-retreat');
  });

  it('strips diacritics (Ş → s, ğ → g) and drops chars with no ASCII fallback (ə, ı)', () => {
    // ə (U+0259) and ı (U+0131) don't have a canonical decomposition, so the
    // post-NFKD [^a-z0-9] sweep drops them — that's the intended trade-off.
    expect(slugify('Qəbələ Şam Ağacları')).toBe('q-b-l-sam-agaclar');
    expect(slugify('Café Façade')).toBe('cafe-facade');
  });

  it('collapses runs of separators and trims edges', () => {
    expect(slugify('  hello -- world!! ')).toBe('hello-world');
  });

  it('returns empty string for purely non-alphanumeric input', () => {
    expect(slugify('!!! ??? ---')).toBe('');
  });

  it('caps length at 80 characters', () => {
    expect(slugify('a'.repeat(200)).length).toBe(80);
  });
});

describe('uniqueSlug', () => {
  it('returns the base slug if it is free', () => {
    expect(uniqueSlug('villa', new Set(['other']))).toBe('villa');
  });

  it('appends -2 when the base is taken', () => {
    expect(uniqueSlug('villa', new Set(['villa']))).toBe('villa-2');
  });

  it('skips taken numbered variants', () => {
    expect(uniqueSlug('villa', new Set(['villa', 'villa-2', 'villa-3']))).toBe('villa-4');
  });
});
