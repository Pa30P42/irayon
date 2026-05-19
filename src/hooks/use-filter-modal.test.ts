import { makeFilterState } from '@/test/factories';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFilterModal } from './use-filter-modal';

describe('useFilterModal', () => {
  it('keeps a local draft separate from the committed state', () => {
    const onApply = vi.fn();
    const initial = makeFilterState();
    const { result } = renderHook(() => useFilterModal({ initial, onApply }));

    act(() => result.current.toggle('extra', 'pool'));

    expect(result.current.draft.extra).toEqual(['pool']);
    expect(initial.extra).toEqual([]);
    expect(onApply).not.toHaveBeenCalled();
  });

  it('apply forwards the draft and closes the modal', () => {
    const onApply = vi.fn();
    const { result } = renderHook(() => useFilterModal({ initial: makeFilterState(), onApply }));

    act(() => result.current.setOpen(true));
    act(() => result.current.toggle('extra', 'pool'));
    act(() => result.current.apply());

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0]?.[0].extra).toEqual(['pool']);
    expect(result.current.open).toBe(false);
  });

  it('reset clears all selections but preserves the search query', () => {
    const initial = makeFilterState({
      q: 'guba',
      village: ['qirmizi-qasaba'],
      extra: ['pool'],
      guests: 'lt5',
    });
    const { result } = renderHook(() => useFilterModal({ initial, onApply: vi.fn() }));

    act(() => result.current.setOpen(true));
    act(() => result.current.reset());

    expect(result.current.draft.q).toBe('guba');
    expect(result.current.draft.village).toEqual([]);
    expect(result.current.draft.extra).toEqual([]);
    expect(result.current.draft.guests).toBeNull();
  });

  it('re-syncs the draft from initial whenever the modal re-opens', () => {
    const onApply = vi.fn();
    const { result, rerender } = renderHook(({ initial }) => useFilterModal({ initial, onApply }), {
      initialProps: { initial: makeFilterState() },
    });

    act(() => result.current.setOpen(true));
    act(() => result.current.toggle('extra', 'pool'));
    act(() => result.current.setOpen(false));

    // Caller pushes a new committed state; reopening should hydrate from it.
    rerender({ initial: makeFilterState({ extra: ['sauna'] }) });
    act(() => result.current.setOpen(true));

    expect(result.current.draft.extra).toEqual(['sauna']);
  });
});

describe('useFilterModal — history integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset jsdom's history state between tests so markers from prior runs
    // don't bleed in.
    window.history.replaceState({}, '', window.location.href);
  });

  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState({}, '', window.location.href);
  });

  const MARKER = '__filtersModal';

  it('open pushes a history entry tagged with the modal marker', () => {
    const { result } = renderHook(() =>
      useFilterModal({ initial: makeFilterState(), onApply: vi.fn() }),
    );

    act(() => result.current.setOpen(true));

    expect((window.history.state as Record<string, unknown>)?.[MARKER]).toBe(true);
  });

  it('apply strips the marker once nuqs has had time to flush', () => {
    const { result } = renderHook(() =>
      useFilterModal({ initial: makeFilterState(), onApply: vi.fn() }),
    );

    act(() => result.current.setOpen(true));
    expect((window.history.state as Record<string, unknown>)?.[MARKER]).toBe(true);

    act(() => result.current.apply());
    // Synchronously, the marker may still be present — strip is deferred so
    // it doesn't race nuqs's batched replaceState.
    act(() => {
      vi.runAllTimers();
    });

    expect((window.history.state as Record<string, unknown>)?.[MARKER]).toBeUndefined();
  });

  it('browser back (popstate without marker) closes the modal', () => {
    const { result } = renderHook(() =>
      useFilterModal({ initial: makeFilterState(), onApply: vi.fn() }),
    );

    act(() => result.current.setOpen(true));
    expect(result.current.open).toBe(true);

    // Simulate browser back: jsdom doesn't always trigger popstate on
    // history.back, so dispatch directly after clearing the marker.
    act(() => {
      window.history.replaceState({}, '', window.location.href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current.open).toBe(false);
  });

  it('popstate to an entry that still has the marker does NOT reopen the modal', () => {
    const { result } = renderHook(() =>
      useFilterModal({ initial: makeFilterState(), onApply: vi.fn() }),
    );

    act(() => result.current.setOpen(true));
    act(() => result.current.apply());
    act(() => {
      vi.runAllTimers();
    });
    expect(result.current.open).toBe(false);

    // Pretend a navigation landed on an old entry where the marker is still
    // present. Modal should stay closed — popstate must not flip open=true.
    act(() => {
      window.history.replaceState({ [MARKER]: true }, '', window.location.href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current.open).toBe(false);
  });
});
