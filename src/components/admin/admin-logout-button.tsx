'use client';

import { useAdminLogout } from '@/hooks/use-admin-logout';
import { IconLoader2, IconLogout } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export function AdminLogoutButton() {
  const router = useRouter();
  const logout = useAdminLogout();
  const t = useTranslations('admin.nav');

  const onClick = () => {
    if (logout.isPending) return;
    logout.mutate(undefined, {
      // Redirect regardless: a network failure shouldn't strand the user on
      // an admin page that won't authenticate on the next request.
      onSettled: () => {
        router.push('/admin/login');
        router.refresh();
      },
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={logout.isPending}
      className="text-foreground-muted hover:text-foreground inline-flex items-center gap-1.5 disabled:opacity-50"
    >
      {logout.isPending ? (
        <IconLoader2 size={14} className="animate-spin" aria-hidden />
      ) : (
        <IconLogout size={14} aria-hidden />
      )}
      <span>{t('signOut')}</span>
    </button>
  );
}
