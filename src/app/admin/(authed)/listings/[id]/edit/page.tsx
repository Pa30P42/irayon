import { EditListingClient } from '@/components/admin/edit-listing-client';
import { Heading } from '@/components/ui/typography';
import { getListingById, getListingImagesById } from '@/lib/api/listings-service';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditListingPage({ params }: PageProps) {
  const { id } = await params;
  const [listing, images, t] = await Promise.all([
    getListingById(id),
    getListingImagesById(id),
    getTranslations('admin.listings.editPage'),
  ]);
  if (!listing) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-1">
        <Heading as="h1" level="page">
          {t('title')}
        </Heading>
        <p className="text-foreground-muted text-sm">
          {t.rich('description', { strong: (chunks) => <strong>{chunks}</strong> })}
        </p>
      </header>
      <EditListingClient listing={listing} images={images} />
    </div>
  );
}
