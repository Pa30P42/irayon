'use client';

import { useMutation } from '@tanstack/react-query';

type TrackCallInput = {
  listingId: string;
  source?: 'detail' | 'card';
};

async function trackCallRequest(input: TrackCallInput): Promise<void> {
  // Fire-and-forget analytics. `keepalive` lets the request survive the
  // navigation that a tel: link triggers on mobile.
  await fetch('/api/calls', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
    keepalive: true,
  });
}

export function useTrackCall() {
  return useMutation({ mutationFn: trackCallRequest });
}
