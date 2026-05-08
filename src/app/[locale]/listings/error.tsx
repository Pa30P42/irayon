'use client';
// Client component: Next.js error boundaries are required to be client components.

import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

export default function ListingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="container-wide py-20 text-center">
      <h1 className="text-2xl font-semibold">We couldn&apos;t load the listings</h1>
      <p className="text-foreground-muted mt-2 text-sm">{error.message}</p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </section>
  );
}
