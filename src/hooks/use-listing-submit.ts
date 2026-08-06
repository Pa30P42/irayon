'use client';

import type { CreateListingInput } from '@/lib/api/listings-create-validator';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * Submit state machine + create/update/upload orchestration for the listing
 * form. Composes three useMutation calls so each step's network errors flow
 * through the query client (and invalidate `listings` on success) while a
 * top-level phase state drives the action-bar UI.
 */

export type SubmitState =
  | { phase: 'idle' }
  | { phase: 'creating' }
  | { phase: 'updating' }
  | { phase: 'uploading'; current: number; total: number }
  | { phase: 'success'; id: string; slug: string }
  | { phase: 'error'; message: string };

export type SubmitTarget = { id: string; slug: string };

type UseListingSubmitArgs = {
  mode: 'create' | 'edit';
  listingId?: string | undefined;
  onSubmitted?: ((result: SubmitTarget) => void) | undefined;
};

type UseListingSubmitResult = {
  state: SubmitState;
  isBusy: boolean;
  submit: (values: CreateListingInput, readyFiles: File[]) => Promise<void>;
};

async function createListingRequest(values: CreateListingInput): Promise<SubmitTarget> {
  const res = await fetch('/api/admin/listings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(values),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Create failed (${res.status})`);
  }
  return (await res.json()) as SubmitTarget;
}

async function updateListingRequest({
  listingId,
  values,
}: {
  listingId: string;
  values: CreateListingInput;
}): Promise<SubmitTarget> {
  const res = await fetch(`/api/admin/listings/${encodeURIComponent(listingId)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(values),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Update failed (${res.status})`);
  }
  return (await res.json()) as SubmitTarget;
}

async function uploadListingImagesRequest({
  listingId,
  files,
}: {
  listingId: string;
  files: File[];
}): Promise<void> {
  const form = new FormData();
  for (const f of files) form.append('files', f);
  const res = await fetch(`/api/admin/listings/${encodeURIComponent(listingId)}/images`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Upload failed (${res.status})`);
  }
}

export function useListingSubmit({
  mode,
  listingId,
  onSubmitted,
}: UseListingSubmitArgs): UseListingSubmitResult {
  const isEdit = mode === 'edit';
  const queryClient = useQueryClient();
  const [state, setState] = useState<SubmitState>({ phase: 'idle' });

  const create = useMutation({ mutationFn: createListingRequest });
  const update = useMutation({ mutationFn: updateListingRequest });
  const upload = useMutation({ mutationFn: uploadListingImagesRequest });

  const submit = async (values: CreateListingInput, readyFiles: File[]): Promise<void> => {
    try {
      let target: SubmitTarget;

      if (isEdit) {
        if (!listingId) throw new Error('Edit mode requires a listingId');
        setState({ phase: 'updating' });
        target = await update.mutateAsync({ listingId, values });
      } else {
        setState({ phase: 'creating' });
        target = await create.mutateAsync(values);
      }

      if (readyFiles.length > 0) {
        // One request per file: progress is real (not 0→total in one jump)
        // and a failure loses only that file, not the whole batch. Sequential
        // on purpose — the server assigns `order` per request, so concurrent
        // uploads would race the ordering.
        const total = readyFiles.length;
        setState({ phase: 'uploading', current: 0, total });
        const failed: string[] = [];
        for (const [index, file] of readyFiles.entries()) {
          try {
            await upload.mutateAsync({ listingId: target.id, files: [file] });
          } catch {
            failed.push(file.name);
          }
          setState({ phase: 'uploading', current: index + 1, total });
        }
        if (failed.length > 0) {
          // The listing itself saved; surface which photos need a retry.
          queryClient.invalidateQueries({ queryKey: ['listings'] });
          queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
          setState({
            phase: 'error',
            message: `Saved, but ${failed.length} photo(s) failed to upload: ${failed.join(', ')}`,
          });
          return;
        }
      }

      // Invalidate listings cache so admin/public lists pick up the change.
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
      setState({ phase: 'success', id: target.id, slug: target.slug });
      onSubmitted?.(target);
    } catch (err) {
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong',
      });
    }
  };

  const isBusy =
    state.phase === 'creating' || state.phase === 'updating' || state.phase === 'uploading';

  return { state, isBusy, submit };
}
