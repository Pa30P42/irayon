import { makeFilterState } from '@/test/factories';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
