'use client';

import { IconLoader2, IconLogout } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AdminLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } catch {
      // Network failure — best effort. Redirect anyway so the UI clears.
    }
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="text-foreground-muted hover:text-foreground inline-flex items-center gap-1.5 disabled:opacity-50"
    >
      {busy ? (
        <IconLoader2 size={14} className="animate-spin" aria-hidden />
      ) : (
        <IconLogout size={14} aria-hidden />
      )}
      <span>Sign out</span>
    </button>
  );
}
