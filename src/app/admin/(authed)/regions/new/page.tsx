import { NewRegionClient } from '@/components/admin/new-region-client';
import Link from 'next/link';

export const metadata = {
  title: 'New region · iRayon Admin',
};

export default function NewRegionPage() {
  return (
    <>
      <header className="mb-5">
        <p className="text-foreground-muted text-sm">
          <Link href="/admin/regions" className="hover:text-foreground">
            Regions
          </Link>
          {' / '}
          <span>New</span>
        </p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">New region</h1>
      </header>
      <NewRegionClient />
    </>
  );
}
