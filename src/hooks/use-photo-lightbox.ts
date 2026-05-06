'use client';

import { useCallback, useEffect, useState } from 'react';

type UsePhotoLightboxResult = {
  open: boolean;
  setOpen: (open: boolean) => void;
  index: number;
  total: number;
  openAt: (i: number) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
};

export function usePhotoLightbox(total: number): UsePhotoLightboxResult {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const openAt = useCallback(
    (i: number) => {
      if (total === 0) return;
      const clamped = Math.max(0, Math.min(i, total - 1));
      setIndex(clamped);
      setOpen(true);
    },
    [total],
  );

  const close = useCallback(() => setOpen(false), []);

  const next = useCallback(() => {
    if (total === 0) return;
    setIndex((i) => (i + 1) % total);
  }, [total]);

  const prev = useCallback(() => {
    if (total === 0) return;
    setIndex((i) => (i - 1 + total) % total);
  }, [total]);

  // Keyboard navigation while the lightbox is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, next, prev, close]);

  return { open, setOpen, index, total, openAt, close, next, prev };
}
