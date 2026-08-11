import { describe, expect, it } from 'vitest';
import {
  config,
  isAdminPath,
  isBreakGlassPath,
  isPrivateApiPath,
  isPrivatePagePath,
} from './middleware';

/**
 * The matcher is a string Next compiles into a route pattern. Reconstructing it
 * here as a RegExp is the only way to assert what it does or doesn't catch —
 * and this file exists because it previously didn't catch enough.
 */
const matcher = new RegExp(`^${config.matcher[0]!}$`);
const isMatched = (pathname: string): boolean => matcher.test(pathname);

describe('middleware matcher', () => {
  it('gates dotted admin paths — the hole the old `.*\\..*` exclusion left open', () => {
    // The previous matcher excluded ANY path containing a dot, so `/admin/x.y`
    // never reached the middleware and was never gated at all: the request went
    // straight through to the app router.
    expect(isMatched('/admin/x.y')).toBe(true);
    expect(isMatched('/admin/listings/some.id')).toBe(true);
    expect(isMatched('/api/admin/listings/a.b')).toBe(true);
  });

  it('still matches ordinary app and API paths', () => {
    expect(isMatched('/')).toBe(true);
    expect(isMatched('/az/listings')).toBe(true);
    expect(isMatched('/admin/listings')).toBe(true);
    expect(isMatched('/api/listings')).toBe(true);
    expect(isMatched('/az/host/listings/new')).toBe(true);
  });

  it('skips Next internals and static assets', () => {
    expect(isMatched('/_next/static/chunk.js')).toBe(false);
    expect(isMatched('/_vercel/insights/script.js')).toBe(false);
    expect(isMatched('/logo.svg')).toBe(false);
    expect(isMatched('/photo.jpg')).toBe(false);
    expect(isMatched('/robots.txt')).toBe(false);
    expect(isMatched('/sitemap/listings.xml')).toBe(false);
    expect(isMatched('/manifest.webmanifest')).toBe(false);
  });

  it('only skips an extension at the END of the path', () => {
    // A dot mid-path must not buy a bypass, whatever follows it.
    expect(isMatched('/admin/a.jpg/listings')).toBe(true);
    expect(isMatched('/api/admin/x.png/delete')).toBe(true);
  });
});

describe('path classification', () => {
  it('recognises admin pages and admin APIs', () => {
    expect(isAdminPath('/admin')).toBe(true);
    expect(isAdminPath('/admin/listings')).toBe(true);
    expect(isAdminPath('/api/admin/listings')).toBe(true);
    // Prefix-only matches must not leak: `/administrators` is not admin.
    expect(isAdminPath('/administrators')).toBe(false);
    expect(isAdminPath('/az/listings')).toBe(false);
  });

  it('identifies the break-glass surface exactly', () => {
    expect(isBreakGlassPath('/admin/login')).toBe(true);
    expect(isBreakGlassPath('/api/admin/auth/login')).toBe(true);
    expect(isBreakGlassPath('/api/admin/auth/logout')).toBe(true);
    expect(isBreakGlassPath('/admin/login/extra')).toBe(false);
    expect(isBreakGlassPath('/admin/listings')).toBe(false);
  });

  it('covers every private API prefix', () => {
    for (const path of [
      '/api/admin/listings',
      '/api/host/listings',
      '/api/account/bookings',
      '/api/bookings',
      '/api/conversations/abc/messages',
      '/api/session/terminate',
    ]) {
      expect(isPrivateApiPath(path)).toBe(true);
    }
    expect(isPrivateApiPath('/api/listings')).toBe(false);
    expect(isPrivateApiPath('/api/auth/session')).toBe(false);
    // Not a prefix match on a longer segment.
    expect(isPrivateApiPath('/api/hosts')).toBe(false);
  });

  it('recognises private pages under every locale, and without one', () => {
    for (const path of [
      '/az/host',
      '/ru/host/listings',
      '/en/account/bookings',
      '/host',
      '/account',
    ]) {
      expect(isPrivatePagePath(path)).toBe(true);
    }
    expect(isPrivatePagePath('/az/listings')).toBe(false);
    expect(isPrivatePagePath('/az/hosts/abc')).toBe(false);
    // Public host profiles live at /hosts/[id] and must stay public.
    expect(isPrivatePagePath('/en/hosts/user_1')).toBe(false);
  });
});
