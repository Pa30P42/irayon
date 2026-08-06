'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

/**
 * Top-of-page progress bar that closes the perceived "dead zone" between a
 * `<Link>` click and Next.js committing the navigation (when `loading.tsx`
 * finally renders). Starts on click of any same-origin anchor, completes when
 * the pathname / searchParams change.
 */
export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const start = () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      // `flushSync` is load-bearing: Next.js wraps Link clicks in a transition,
      // so a plain setState would be batched with the navigation and only paint
      // *after* the route commits — too late to be a "progress" indicator.
      flushSync(() => {
        setVisible(true);
        setProgress(8);
      });
      // Approach (but never reach) 90% so the bar feels alive while waiting.
      tickRef.current = setInterval(() => {
        setProgress((p) => (p < 90 ? p + (90 - p) * 0.08 : p));
      }, 200);
    };

    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href) return;
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Same URL = no navigation = no bar.
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      start();
    };

    document.addEventListener('click', handleClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
      if (tickRef.current) clearInterval(tickRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (tickRef.current) clearInterval(tickRef.current);
    setProgress(100);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 220);
    // We intentionally trigger only on URL change, not on `visible`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-60 h-0.5">
      <div
        className="bg-primary h-full shadow-[0_0_8px_var(--color-primary)] transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }}
      />
    </div>
  );
}
