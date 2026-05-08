import { EditListingClient } from '@/components/admin/edit-listing-client';
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
        <h1 className="text-2xl font-semibold sm:text-3xl">Edit listing</h1>
        <p className="text-foreground-muted text-sm">
          Update fields and tap <strong>Save changes</strong>. Removing or adding photos applies
          immediately; everything else is saved together.
        </p>
      </header>
      <EditListingClient listing={listing} images={images} />
    </div>
  );
}
