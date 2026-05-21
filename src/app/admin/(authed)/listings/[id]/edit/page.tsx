import { EditListingClient } from '@/components/admin/edit-listing-client';
import { Heading } from '@/components/ui/typography';
import { getListingById, getListingImagesById } from '@/lib/api/listings-service';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditListingPage({ params }: PageProps) {
  const { id } = await params;
  const [listing, images] = await Promise.all([getListingById(id), getListingImagesById(id)]);
  if (!listing) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-1">
        <Heading as="h1" level="page">
          Edit listing
        </Heading>
        <p className="text-foreground-muted text-sm">
          Update fields and tap <strong>Save changes</strong>. Removing or adding photos applies
          immediately; everything else is saved together.
        </p>
      </header>
      <EditListingClient listing={listing} images={images} />
    </div>
  );
}
