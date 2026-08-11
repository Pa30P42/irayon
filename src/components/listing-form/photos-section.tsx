'use client';

import type { ListingEndpoints } from '@/components/listing-form/endpoints';
import { ExistingImagesGrid } from '@/components/listing-form/existing-images-grid';
import { ImageUploader } from '@/components/listing-form/image-uploader';
import { SectionCard } from '@/components/ui/section-card';
import { useTranslations } from 'next-intl';

type ExistingImage = { id: string; url: string };

type Props = {
  action: 'create' | 'edit';
  endpoints: ListingEndpoints;
  listingId?: string | undefined;
  existingImages: ExistingImage[];
  onExistingImagesChange: (next: ExistingImage[]) => void;
  onReadyFilesChange: (files: File[]) => void;
};

export function ListingFormPhotosSection({
  action,
  endpoints,
  listingId,
  existingImages,
  onExistingImagesChange,
  onReadyFilesChange,
}: Props) {
  const tSections = useTranslations('admin.listingForm.sections');
  const isEdit = action === 'edit';
  return (
    <SectionCard title={tSections('photosTitle')} description={tSections('photosDescription')}>
      {isEdit && listingId ? (
        <ExistingImagesGrid
          listingId={listingId}
          endpoints={endpoints}
          images={existingImages}
          onChange={onExistingImagesChange}
        />
      ) : null}
      <ImageUploader onReadyFilesChange={onReadyFilesChange} />
    </SectionCard>
  );
}
