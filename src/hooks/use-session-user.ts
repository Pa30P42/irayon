'use client';

import { useQuery } from '@tanstack/react-query';

export type SessionUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: 'user' | 'admin';
  /** `becameHostAt` is set — the user has created at least one listing. */
  isHost: boolean;
};

export const SESSION_USER_QUERY_KEY = ['session-user'] as const;

async function fetchSessionUser(signal?: AbortSignal): Promise<SessionUser | null> {
  const res = await fetch('/api/account/me', {
    cache: 'no-store',
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { user: SessionUser | null };
  return json.user;
}

/**
 * Who is signed in, fetched client-side.
 *
 * The header must not read the session on the server: that would mark the
 * whole `[locale]` layout dynamic and take every prerendered public page off
 * ISR with it. One small no-store request buys back the entire static
 * catalogue.
 *
 * `null` is a first-class, completely normal answer — most visitors are
 * anonymous — so this never surfaces an error state.
 */
export function useSessionUser() {
  return useQuery({
    queryKey: SESSION_USER_QUERY_KEY,
    queryFn: ({ signal }) => fetchSessionUser(signal),
    // The session changes only on sign-in/out, both of which do a full reload.
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
