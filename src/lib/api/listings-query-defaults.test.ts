import { describe, expect, it } from 'vitest';
import { emptyListingsQuery } from './listings-query-defaults';

describe('emptyListingsQuery', () => {
  it('fills in the same defaults the zod schema applies', () => {
    const q = emptyListingsQuery();
    expect(q).toEqual({
      q: '',
      region: [],
      village: [],
      type: [],
      placement: [],
      food: [],
      extra: [],
      basic: [],
      amenities: [],
      fun: [],
      page: 1,
      limit: 24,
    });
  });

  it('accepts an unbounded `limit` (sitemap/staticParams need 1000+ rows)', () => {
    // Regression: previously this went through `.parse()` and tripped the
    // API's 100-row cap at build time during `generateStaticParams`.
    const q = emptyListingsQuery({ limit: 1000 });
    expect(q.limit).toBe(1000);
  });

  it('overrides win over defaults; unspecified fields keep defaults', () => {
    const q = emptyListingsQuery({ region: ['gabala'], sort: 'newest', limit: 50 });
    expect(q.region).toEqual(['gabala']);
    expect(q.sort).toBe('newest');
    expect(q.limit).toBe(50);
    // Untouched defaults still present.
    expect(q.q).toBe('');
    expect(q.page).toBe(1);
  });
});
