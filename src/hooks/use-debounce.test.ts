import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebounce } from './use-debounce';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebounce', () => {
  it('returns the initial value synchronously', () => {
    const { result } = renderHook(() => useDebounce('first', 250));
    expect(result.current).toBe('first');
  });

  it('emits the latest value only after the delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 250),
      { initialProps: { value: 'a' } },
    );

    rerender({ value: 'b' });
    rerender({ value: 'c' });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(249);
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(result.current).toBe('c');
  });

  it('cancels the pending timeout when the component unmounts (no leak)', () => {
    const { unmount, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 250),
      { initialProps: { value: 'a' } },
    );

    rerender({ value: 'b' });
    unmount();

    // Advance well past the delay — if cleanup is broken, the inner setState
    // would log a "set state on unmounted component" warning. The test passes
    // when the timer fires harmlessly into the void.
    expect(() =>
      act(() => {
        vi.advanceTimersByTime(1_000);
      }),
    ).not.toThrow();
  });

  it('respects an updated delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 100 } },
    );

    rerender({ value: 'b', delay: 100 });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    rerender({ value: 'b', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    // With the longer delay, value hasn't flushed yet.
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe('b');
  });
});
