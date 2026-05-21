'use client';

import { useMutation } from '@tanstack/react-query';

async function logoutRequest(): Promise<void> {
  await fetch('/api/admin/auth/logout', { method: 'POST' });
}

export function useAdminLogout() {
  return useMutation({ mutationFn: logoutRequest });
}
