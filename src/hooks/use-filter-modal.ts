'use client';

import { emptyFilterState } from '@/lib/constants';
import { toggleOption } from '@/lib/listings-filter';
import type { FilterGroupName, ListingsFilterState } from '@/types';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

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

// Marker stashed on history.state when opening the modal. On browser back,
// popstate fires and history.state no longer has it → close the modal.
const HISTORY_MARKER = '__filtersModal';

// Long enough to outlast nuqs's default 50ms throttle, so our marker strip
// runs AFTER nuqs has flushed its replaceState (otherwise nuqs would overwrite
// our cleanup, and any preserved marker would prevent back from closing the
// modal next time it re-opens).
const POST_APPLY_STRIP_DELAY_MS = 120;

const hasMarker = (state: unknown): boolean =>
  typeof state === 'object' &&
  state !== null &&
  (state as Record<string, unknown>)[HISTORY_MARKER] === true;

const stripMarkerInPlace = (): void => {
  const state = window.history.state;
  if (!hasMarker(state)) return;
  const { [HISTORY_MARKER]: _, ...rest } = state as Record<string, unknown>;
  window.history.replaceState(rest, '', window.location.href);
};

const pushHistoryEntry = (ownsEntryRef: RefObject<boolean>): void => {
  if (ownsEntryRef.current) return;
  window.history.pushState(
    { ...(window.history.state ?? {}), [HISTORY_MARKER]: true },
    '',
    window.location.href,
  );
  ownsEntryRef.current = true;
};

// Triggers popstate, which makes our handler flip `open` to false. Used by
// programmatic close (X / ESC / setOpen(false)) so the entry we pushed when
// opening doesn't linger as dead history the user has to back past.
const closeViaPopstate = (ownsEntryRef: RefObject<boolean>): void => {
  if (!ownsEntryRef.current) return;
  ownsEntryRef.current = false;
  window.history.back();
};

export function useFilterModal({ initial, onApply }: UseFilterModalArgs): UseFilterModalResult {
  const [open, setOpenState] = useState(false);
  const [draft, setDraft] = useState<ListingsFilterState>(initial);
  // Whether we currently own a pushed history entry. Lets close decide between
  // popping that entry vs. just flipping state (e.g. deep-link case).
  const ownsHistoryEntryRef = useRef(false);

  // Latest `initial` via ref so the open-sync effect can read it without
  // re-firing on every parent render (parent rebuilds `initial` each render).
  const initialRef = useRef(initial);
  useEffect(() => {
    initialRef.current = initial;
  }, [initial]);

  // Hydrate draft from committed state on open.
  useEffect(() => {
    if (open) setDraft(initialRef.current);
  }, [open]);

  // Browser back/forward: if our marker is gone, the user dismissed us.
  useEffect(() => {
    const onPopState = () => {
      if (hasMarker(window.history.state)) return;
      ownsHistoryEntryRef.current = false;
      setOpenState(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    if (next) pushHistoryEntry(ownsHistoryEntryRef);
    else closeViaPopstate(ownsHistoryEntryRef);
  }, []);

  const toggle = useCallback((group: FilterGroupName, option: string) => {
    setDraft((prev) => toggleOption(prev, group, option));
  }, []);

  const reset = useCallback(() => {
    setDraft((prev) => ({ ...emptyFilterState(), q: prev.q }));
  }, []);

  // Apply must not pop or synchronously touch history: popping reverts the
  // filter URL we just wrote via onApply → nuqs, and a synchronous replaceState
  // races nuqs's batched flush. Flip state now; strip our marker AFTER nuqs has
  // settled so the next back navigation closes correctly even after
  // open → apply → reopen → back.
  const apply = useCallback(() => {
    onApply(draft);
    ownsHistoryEntryRef.current = false;
    setOpenState(false);
    window.setTimeout(stripMarkerInPlace, POST_APPLY_STRIP_DELAY_MS);
  }, [draft, onApply]);

  return { open, setOpen, draft, setDraft, toggle, reset, apply };
}
