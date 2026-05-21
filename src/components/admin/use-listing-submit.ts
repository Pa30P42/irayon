'use client';

import type { CreateListingInput } from '@/lib/api/listings-create-validator';
import { useState } from 'react';

/**
 * Submit state machine + create/update/upload orchestration for the listing
 * form. Pulled out so the form component itself stays a thin wrapper around
 * the JSX — and so a future "save to drafts" / "publish" split has one place
 * to grow.
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
  listingId?: string;
  onSubmitted?: (result: SubmitTarget) => void;
};

type UseListingSubmitResult = {
  state: SubmitState;
  isBusy: boolean;
  submit: (values: CreateListingInput, readyFiles: File[]) => Promise<void>;
};

export function useListingSubmit({
  mode,
  listingId,
  onSubmitted,
}: UseListingSubmitArgs): UseListingSubmitResult {
  const isEdit = mode === 'edit';
  const [state, setState] = useState<SubmitState>({ phase: 'idle' });

  const submit = async (values: CreateListingInput, readyFiles: File[]): Promise<void> => {
    try {
      let target: SubmitTarget;

      if (isEdit) {
        if (!listingId) throw new Error('Edit mode requires a listingId');
        setState({ phase: 'updating' });
        const patchRes = await fetch(`/api/admin/listings/${listingId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(values),
        });
        if (!patchRes.ok) {
          const text = await patchRes.text();
          throw new Error(text || `Update failed (${patchRes.status})`);
        }
        const updated = (await patchRes.json()) as SubmitTarget;
        target = { id: updated.id, slug: updated.slug };
      } else {
        setState({ phase: 'creating' });
        const createRes = await fetch('/api/admin/listings', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(values),
        });
        if (!createRes.ok) {
          const text = await createRes.text();
          throw new Error(text || `Create failed (${createRes.status})`);
        }
        target = (await createRes.json()) as SubmitTarget;
      }

      if (readyFiles.length > 0) {
        setState({ phase: 'uploading', current: 0, total: readyFiles.length });
        const form = new FormData();
        for (const f of readyFiles) form.append('files', f);
        const uploadRes = await fetch(`/api/admin/listings/${target.id}/images`, {
          method: 'POST',
          body: form,
        });
        if (!uploadRes.ok) {
          const text = await uploadRes.text();
          throw new Error(text || `Upload failed (${uploadRes.status})`);
        }
        setState({
          phase: 'uploading',
          current: readyFiles.length,
          total: readyFiles.length,
        });
      }

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
