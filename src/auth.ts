import { authConfig } from '@/auth.config';
import { prisma } from '@/lib/prisma';
import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { cookies } from 'next/headers';
import { z } from 'zod';

/**
 * Full (Node-runtime) Auth.js setup: edge-safe config + Prisma adapter +
 * the callbacks that touch the database.
 *
 * Split from `auth.config.ts` on purpose — see the note there.
 */

/**
 * DEVELOPMENT-ONLY email sign-in.
 *
 * Google is the only provider that will ever exist in production. This one
 * exists so the entire marketplace — host signup, moderation, bookings,
 * messaging — can be exercised locally before OAuth credentials are issued.
 *
 * Two independent conditions gate it, and BOTH must hold: an explicit
 * `AUTH_DEV_LOGIN=true` **and** a non-production `NODE_ENV`. The NODE_ENV check
 * is the one that matters: it means shipping the env var to production by
 * accident still cannot open a passwordless login, because the provider is
 * never registered there at all.
 */
const devLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().max(80).optional(),
});

const devLoginEnabled = (): boolean =>
  process.env.NODE_ENV !== 'production' && process.env.AUTH_DEV_LOGIN === 'true';

const devProvider = devLoginEnabled()
  ? [
      Credentials({
        id: 'dev-login',
        name: 'Development sign-in',
        credentials: { email: { label: 'Email', type: 'email' }, name: { label: 'Name' } },
        async authorize(raw) {
          // Belt and braces: `authorize` can only run if the provider was
          // registered, but re-check rather than rely on module init order.
          if (!devLoginEnabled()) return null;

          const parsed = devLoginSchema.safeParse(raw);
          if (!parsed.success) return null;
          const { email, name } = parsed.data;

          // The Credentials provider bypasses the adapter's createUser, so the
          // row is managed here. Suspension is honoured exactly as it is for
          // Google (see the `signIn` callback).
          const existing = await prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, image: true, suspendedAt: true },
          });
          if (existing) {
            return existing.suspendedAt
              ? null
              : { id: existing.id, email, name: existing.name, image: existing.image };
          }

          const created = await prisma.user.create({
            data: { email, name: name || email.split('@')[0] || null },
            select: { id: true, name: true, image: true },
          });
          return { id: created.id, email, name: created.name, image: created.image };
        },
      }),
    ]
  : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [...authConfig.providers, ...devProvider],
  callbacks: {
    /**
     * Suspension must block sign-in, not just live sessions. Without this a
     * suspended user signs in with Google again, receives a fresh valid JWT,
     * and the suspension is bypassed for the whole strict-check cache window.
     *
     * The lookup is BY EMAIL, not by id: a first-time signup has no row yet,
     * so an id lookup would reject every new user.
     */
    async signIn({ user }) {
      if (!user.email) return false;
      const row = await prisma.user.findUnique({
        where: { email: user.email },
        select: { suspendedAt: true },
      });
      return row == null || row.suspendedAt == null; // no row = new user, allow
    },

    /**
     * Mint `role` and `sv` into the token at sign-in (and whenever a caller
     * triggers an update). Middleware reads these optimistically; every
     * server-side gate re-checks them against the database.
     */
    async jwt({ token, user, trigger }) {
      const userId = user?.id ?? token.sub;
      if (!userId) return token;

      const needsRefresh = !!user || trigger === 'update' || token.role === undefined;
      if (!needsRefresh) return token;

      const row = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, sessionVersion: true },
      });
      if (row) {
        token.sub = userId;
        token.role = row.role === 'ADMIN' ? 'admin' : 'user';
        token.sv = row.sessionVersion;
      }
      return token;
    },

    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.role = token.role ?? 'user';
      session.user.sessionVersion = token.sv ?? 0;
      return session;
    },
  },
  events: {
    /**
     * Seed `preferredLocale` from the locale the user was actually browsing in
     * when they signed up — it drives the language of every email we will ever
     * send them, and asking later is a settings page nobody visits.
     */
    async createUser({ user }) {
      if (!user.id) return;
      try {
        const cookieStore = await cookies();
        const locale = cookieStore.get('NEXT_LOCALE')?.value;
        if (locale && ['az', 'ru', 'en'].includes(locale)) {
          await prisma.user.update({ where: { id: user.id }, data: { preferredLocale: locale } });
        }
      } catch {
        // Best-effort: a missing cookie store (or a locale we don't ship) just
        // leaves the column at its 'az' default. Never fail a signup for this.
      }
    },
  },
});
