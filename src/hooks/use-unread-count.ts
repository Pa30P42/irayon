'use client';

import { useQuery } from '@tanstack/react-query';

export const UNREAD_QUERY_KEY = ['unread'] as const;

async function fetchUnread(signal?: AbortSignal): Promise<number> {
  const res = await fetch('/api/account/unread', {
    cache: 'no-store',
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) return 0;
  const json = (await res.json()) as { notifications: number };
  return json.notifications;
}

/**
 * Unread notification count for the header badge.
 *
 * Polled at 60s, and NEVER in a background tab. A badge is worth one cheap
 * indexed count a minute while someone is looking at the page; it is worth
 * nothing at all in a tab that has been sitting behind others since Tuesday,
 * and polling there is pure cost to both the browser and the connection pool.
 */
export function useUnreadCount(enabled: boolean) {
  return useQuery({
    queryKey: UNREAD_QUERY_KEY,
    queryFn: ({ signal }) => fetchUnread(signal),
    enabled,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  });
}
