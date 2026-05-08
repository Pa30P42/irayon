'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** Pre-load when within this margin of the viewport. */
  rootMargin?: string;
  /** Rendered before the section enters view. */
  fallback?: ReactNode;
  className?: string;
};

/**
 * Defers mounting `children` until the wrapper enters the viewport. Used to
 * avoid hydrating heavy widgets (Leaflet) for sections users may never scroll
 * to.
 */
export function LazyMount({ children, rootMargin = '200px', fallback = null, className }: Props) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} className={className}>
      {visible ? children : fallback}
    </div>
  );
}
