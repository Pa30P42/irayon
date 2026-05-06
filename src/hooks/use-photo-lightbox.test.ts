import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePhotoLightbox } from './use-photo-lightbox';

describe('usePhotoLightbox', () => {
  it('starts closed at index 0', () => {
    const { result } = renderHook(() => usePhotoLightbox(5));
    expect(result.current.open).toBe(false);
    expect(result.current.index).toBe(0);
    expect(result.current.total).toBe(5);
  });

  it('openAt sets the index and opens', () => {
    const { result } = renderHook(() => usePhotoLightbox(5));
    act(() => result.current.openAt(2));
    expect(result.current.open).toBe(true);
    expect(result.current.index).toBe(2);
  });

  it('clamps openAt to [0, total - 1]', () => {
    const { result } = renderHook(() => usePhotoLightbox(3));
    act(() => result.current.openAt(99));
    expect(result.current.index).toBe(2);
    act(() => result.current.openAt(-5));
    expect(result.current.index).toBe(0);
  });

  it('next wraps from last to first', () => {
    const { result } = renderHook(() => usePhotoLightbox(3));
    act(() => result.current.openAt(2));
    act(() => result.current.next());
    expect(result.current.index).toBe(0);
  });

  it('prev wraps from first to last', () => {
    const { result } = renderHook(() => usePhotoLightbox(3));
    act(() => result.current.openAt(0));
    act(() => result.current.prev());
    expect(result.current.index).toBe(2);
  });

  it('arrow keys navigate while open and Escape closes', () => {
    const { result } = renderHook(() => usePhotoLightbox(3));
    act(() => result.current.openAt(0));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    expect(result.current.index).toBe(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });
    expect(result.current.index).toBe(0);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.open).toBe(false);
  });

  it('arrow keys do nothing when closed', () => {
    const { result } = renderHook(() => usePhotoLightbox(3));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    expect(result.current.index).toBe(0);
    expect(result.current.open).toBe(false);
  });

  it('handles total = 0 without crashing', () => {
    const { result } = renderHook(() => usePhotoLightbox(0));
    act(() => result.current.openAt(0));
    expect(result.current.open).toBe(false);
    act(() => result.current.next());
    expect(result.current.index).toBe(0);
  });
});
