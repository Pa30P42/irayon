'use client';

import { useAdminLogout } from '@/hooks/use-admin-logout';
import { IconLoader2, IconLogout } from '@tabler/icons-react';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

/**
 * Two sessions can reach the admin panel and they end in different ways:
 *
 * - the normal case is an Auth.js session whose database role is `admin` —
 *   signing out means clearing the Auth.js cookie;
 * - the break-glass case is an HMAC cookie with no user row behind it, cleared
 *   by `POST /api/admin/auth/logout`.
 *
 * Calling the wrong one leaves the admin apparently logged out but still
 * holding a live session, so the layout tells us which one this is.
 */
export function AdminLogoutButton({ breakGlass = false }: { breakGlass?: boolean }) {
  const router = useRouter();
  const logout = useAdminLogout();
  const t = useTranslations('admin.nav');
  const [isPending, startTransition] = useTransition();

  const busy = logout.isPending || isPending;

  const onClick = () => {
    if (busy) return;

    if (breakGlass) {
      logout.mutate(undefined, {
        // Redirect regardless: a network failure shouldn't strand the user on
        // an admin page that won't authenticate on the next request.
        onSettled: () => {
          router.push('/admin/login');
          router.refresh();
        },
      });
      return;
    }

    startTransition(async () => {
      await signOut({ callbackUrl: '/az/signin' });
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="text-foreground-muted hover:text-foreground inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
    >
      {busy ? (
        <IconLoader2 size={14} className="animate-spin" aria-hidden />
      ) : (
        <IconLogout size={14} aria-hidden />
      )}
      <span>{t('signOut')}</span>
    </button>
  );
}
