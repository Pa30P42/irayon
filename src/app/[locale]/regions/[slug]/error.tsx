'use client';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { useEffect } from 'react';

export default function RegionError({
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
      <h1 className="text-2xl font-semibold">Couldn&apos;t load this region</h1>
      <p className="text-foreground-muted mt-2 text-sm">{error.message}</p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/listings">All listings</Link>
        </Button>
      </div>
    </section>
  );
}
