'use client';

import { useMutation } from '@tanstack/react-query';

type LoginInput = {
  username: string;
  password: string;
};

async function loginRequest({ username, password }: LoginInput): Promise<void> {
  const res = await fetch('/api/admin/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(body?.error?.message || 'Sign-in failed');
  }
}

export function useAdminLogin() {
  return useMutation({ mutationFn: loginRequest });
}
