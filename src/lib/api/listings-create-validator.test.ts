import { describe, expect, it } from 'vitest';
import { createListingSchema } from './listings-create-validator';

const validBase = {
  title: { en: 'Gabala Pine Retreat' },
  description: { en: 'A peaceful pine retreat in the woods.' },
  region: 'gabala',
  direction: 'others',
  placeType: 'villa-cottage',
  category: 'forest',
  price: 320,
  capacity: 8,
  bedrooms: 4,
  lat: 40.9876,
  lng: 47.8234,
  address: 'Vandam, Gabala',
  phone: '+994 50 123 45 67',
};

describe('createListingSchema', () => {
  it('accepts a minimal valid payload', () => {
    const parsed = createListingSchema.parse(validBase);
    expect(parsed.title.en).toBe('Gabala Pine Retreat');
    // Defaults populated for optional locales/lists.
    expect(parsed.title.az).toBe('');
    expect(parsed.title.ru).toBe('');
    expect(parsed.amenities).toEqual([]);
    expect(parsed.meals).toEqual([]);
    expect(parsed.activities).toEqual([]);
  });

  it('requires English title', () => {
    expect(() => createListingSchema.parse({ ...validBase, title: { en: '' } })).toThrow(
      /English title is required/,
    );
  });

  it('rejects unknown enum values', () => {
    expect(() => createListingSchema.parse({ ...validBase, region: 'narnia' })).toThrow();
    expect(() => createListingSchema.parse({ ...validBase, category: 'volcano' })).toThrow();
  });

  it('rejects non-positive prices', () => {
    expect(() => createListingSchema.parse({ ...validBase, price: 0 })).toThrow();
    expect(() => createListingSchema.parse({ ...validBase, price: -1 })).toThrow();
  });

  it('rejects out-of-range coordinates', () => {
    expect(() => createListingSchema.parse({ ...validBase, lat: 91 })).toThrow();
    expect(() => createListingSchema.parse({ ...validBase, lng: -181 })).toThrow();
  });

  it('rejects malformed phone numbers', () => {
    expect(() => createListingSchema.parse({ ...validBase, phone: 'callme' })).toThrow();
    expect(() => createListingSchema.parse({ ...validBase, phone: '+1' })).toThrow();
  });

  it('coerces string numerics from form data', () => {
    const parsed = createListingSchema.parse({
      ...validBase,
      price: '450',
      capacity: '6',
      bedrooms: '3',
      lat: '40.5',
      lng: '49.5',
    });
    expect(parsed.price).toBe(450);
    expect(parsed.capacity).toBe(6);
    expect(parsed.lat).toBe(40.5);
  });

  it('rejects unknown amenities', () => {
    expect(() =>
      createListingSchema.parse({ ...validBase, amenities: ['wifi', 'helicopter'] }),
    ).toThrow();
  });
});
