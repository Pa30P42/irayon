import { describe, expect, it } from 'vitest';
import { listingsQuerySchema, searchParamsToObject } from './listings-validator';

describe('listingsQuerySchema', () => {
  it('applies defaults when nothing is provided', () => {
    const parsed = listingsQuerySchema.parse({});
    expect(parsed).toMatchObject({
      q: '',
      page: 1,
      limit: 24,
      direction: [],
      type: [],
      placement: [],
      food: [],
      extra: [],
      basic: [],
      amenities: [],
      fun: [],
    });
  });

  it('parses page/limit as numbers from string query params', () => {
    const parsed = listingsQuerySchema.parse({ page: '3', limit: '12' });
    expect(parsed.page).toBe(3);
    expect(parsed.limit).toBe(12);
  });

  it('caps the limit at 100', () => {
    expect(() => listingsQuerySchema.parse({ limit: '999' })).toThrow();
  });

  it('accepts comma-separated direction values', () => {
    const parsed = listingsQuerySchema.parse({ direction: 'guba,lerik' });
    expect(parsed.direction).toEqual(['guba', 'lerik']);
  });

  it('accepts repeated query params (URLSearchParams.getAll() shape)', () => {
    const parsed = listingsQuerySchema.parse({ extra: ['pool', 'sauna'] });
    expect(parsed.extra).toEqual(['pool', 'sauna']);
  });

  it('rejects unknown enum values', () => {
    expect(() => listingsQuerySchema.parse({ direction: 'narnia' })).toThrow();
  });

  it('coerces price bounds to integers and rejects negatives', () => {
    expect(listingsQuerySchema.parse({ price_min: '50' }).price_min).toBe(50);
    expect(() => listingsQuerySchema.parse({ price_min: '-5' })).toThrow();
  });
});

describe('searchParamsToObject', () => {
  it('returns single values as strings and repeated values as arrays', () => {
    const params = new URLSearchParams();
    params.set('category', 'mountain');
    params.append('extra', 'pool');
    params.append('extra', 'sauna');

    const obj = searchParamsToObject(params);
    expect(obj['category']).toBe('mountain');
    expect(obj['extra']).toEqual(['pool', 'sauna']);
  });

  it('produces an empty object for empty params', () => {
    expect(searchParamsToObject(new URLSearchParams())).toEqual({});
  });
});
