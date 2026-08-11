'use client';

import type { MessageDto } from '@/lib/api/conversations-service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

/**
 * Polling for an open message thread.
 *
 * Supabase Realtime was the obvious alternative and was rejected: it needs the
 * anon key plus RLS policies keyed to Supabase Auth, which would mean a second
 * authorization system running in parallel with the one every other route uses
 * — two sources of truth about who may read a thread. Polling is one indexed
 * query and fits the hooks that already exist.
 *
 * Polling only earns that trade if it is disciplined, which means three rules:
 *
 *   1. **Never in a background tab.** A thread left open behind other windows
 *      must cost nothing. `refetchIntervalInBackground: false`.
 *   2. **Back off when idle.** After 5 minutes without the reader typing or
 *      touching the page, drop from 5s to 30s. Someone who wandered off is not
 *      waiting for a reply.
 *   3. **Snap back on activity.** Focus or a keypress returns it to 5s
 *      immediately, so the backoff is never something the user notices.
 */
export const ACTIVE_POLL_MS = 5_000;
export const IDLE_POLL_MS = 30_000;
export const IDLE_AFTER_MS = 5 * 60_000;

const KEY = (conversationId: string) => ['messages', conversationId] as const;

async function fetchMessages(conversationId: string, signal?: AbortSignal): Promise<MessageDto[]> {
  const res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
    cache: 'no-store',
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) throw new Error(`Messages fetch failed (${res.status})`);
  const json = (await res.json()) as { data: MessageDto[] };
  return json.data;
}

/**
 * Tracks whether the reader has interacted recently, so the poll interval can
 * follow their attention rather than a fixed clock.
 */
function useIsIdle(): boolean {
  const [idle, setIdle] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const markActive = () => {
      setIdle(false);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setIdle(true), IDLE_AFTER_MS);
    };

    markActive();
    const windowEvents: (keyof WindowEventMap)[] = ['focus', 'keydown', 'pointerdown'];
    for (const event of windowEvents) window.addEventListener(event, markActive);
    // `visibilitychange` fires on the document, not the window.
    document.addEventListener('visibilitychange', markActive);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      for (const event of windowEvents) window.removeEventListener(event, markActive);
      document.removeEventListener('visibilitychange', markActive);
    };
  }, []);

  return idle;
}

export function useMessages(conversationId: string) {
  const idle = useIsIdle();

  return useQuery({
    queryKey: KEY(conversationId),
    queryFn: ({ signal }) => fetchMessages(conversationId, signal),
    refetchInterval: idle ? IDLE_POLL_MS : ACTIVE_POLL_MS,
    // Rule 1. Without this a thread left open in a background tab polls forever
    // against a connection_limit=5 pool.
    refetchIntervalInBackground: false,
    staleTime: 0,
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const parsed = (await res.json().catch(() => null)) as {
          error?: { message?: string; fields?: Record<string, string[]> };
        } | null;
        const field = parsed?.error?.fields
          ? Object.values(parsed.error.fields)[0]?.[0]
          : undefined;
        throw new Error(field ?? parsed?.error?.message ?? `Send failed (${res.status})`);
      }
      return (await res.json()) as MessageDto;
    },
    onSuccess: (message) => {
      // Append immediately rather than waiting up to 5s for the next poll —
      // seeing your own message land late feels like the send failed.
      queryClient.setQueryData<MessageDto[]>(KEY(conversationId), (previous) =>
        previous ? [...previous, message] : [message],
      );
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unread'] });
    },
  });
}

/** Move this side's read cursor and clear the thread's unread notifications. */
export function useMarkRead(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/read`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await fetch('/api/conversations', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Conversations fetch failed (${res.status})`);
      const json = (await res.json()) as { data: unknown[] };
      return json.data;
    },
    // The list is a navigation aid, not a live view — the open thread polls,
    // this doesn't need to.
    staleTime: 30_000,
  });
}
