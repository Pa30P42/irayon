'use client';

import { emptyFilterState } from '@/lib/constants';
import { toggleOption } from '@/lib/listings-filter';
import type { FilterGroupName, ListingsFilterState } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';

type UseFilterModalArgs = {
  initial: ListingsFilterState;
  onApply: (next: ListingsFilterState) => void;
};

type UseFilterModalResult = {
  open: boolean;
  setOpen: (open: boolean) => void;
  draft: ListingsFilterState;
  /** Replace the entire draft. Used by widgets that touch multiple groups at once (e.g. the location picker mutates `region` + `village` together). */
  setDraft: (next: ListingsFilterState) => void;
  toggle: (group: FilterGroupName, option: string) => void;
  reset: () => void;
  apply: () => void;
};

export function useFilterModal({ initial, onApply }: UseFilterModalArgs): UseFilterModalResult {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ListingsFilterState>(initial);

  // Keep a ref to the latest `initial` so the open-sync effect can read it
  // without listing it as a dependency (it's a new object on every parent render,
  // which would otherwise trigger an infinite update loop while the modal is open).
  const initialRef = useRef(initial);
  useEffect(() => {
    initialRef.current = initial;
  }, [initial]);

  // Sync the draft from the latest committed state only when the modal opens.
  useEffect(() => {
    if (open) setDraft(initialRef.current);
  }, [open]);

  const toggle = useCallback((group: FilterGroupName, option: string) => {
    setDraft((prev) => toggleOption(prev, group, option));
  }, []);

  const reset = useCallback(() => {
    setDraft((prev) => ({ ...emptyFilterState(), q: prev.q }));
  }, []);

  const apply = useCallback(() => {
    onApply(draft);
    setOpen(false);
  }, [draft, onApply]);

  return { open, setOpen, draft, setDraft, toggle, reset, apply };
}
