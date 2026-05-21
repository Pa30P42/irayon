import { EditRegionClient } from '@/components/admin/edit-region-client';
import { Heading } from '@/components/ui/typography';
import Link from 'next/link';

export const metadata = {
  title: 'Edit region · iRayon Admin',
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
        <Heading as="h1" level="page" className="mt-1">
          Edit region
        </Heading>
      </header>
      <EditRegionClient regionId={id} />
    </>
  );
}
