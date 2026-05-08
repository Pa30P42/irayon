import { EditRegionClient } from '@/components/admin/edit-region-client';
import Link from 'next/link';

export const metadata = {
  title: 'Edit region · IRayon Admin',
};

type Props = { params: Promise<{ id: string }> };

export default async function EditRegionPage({ params }: Props) {
  const { id } = await params;
  return (
    <>
      <header className="mb-5">
        <p className="text-foreground-muted text-sm">
          <Link href="/admin/regions" className="hover:text-foreground">
            Regions
          </Link>
          {' / '}
          <span>Edit</span>
        </p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Edit region</h1>
      </header>
      <EditRegionClient regionId={id} />
    </>
  );
}
