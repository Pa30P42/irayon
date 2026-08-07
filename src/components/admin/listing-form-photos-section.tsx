'use client';

import { ExistingImagesGrid } from '@/components/admin/existing-images-grid';
import { ImageUploader } from '@/components/admin/image-uploader';
import { SectionCard } from '@/components/ui/section-card';
import { useTranslations } from 'next-intl';

type ExistingImage = { id: string; url: string };

type Props = {
  mode: 'create' | 'edit';
  listingId?: string | undefined;
  existingImages: ExistingImage[];
  onExistingImagesChange: (next: ExistingImage[]) => void;
  onReadyFilesChange: (files: File[]) => void;
};

export function ListingFormPhotosSection({
  mode,
  listingId,
  existingImages,
  onExistingImagesChange,
  onReadyFilesChange,
}: Props) {
  const tSections = useTranslations('admin.listingForm.sections');
  const isEdit = mode === 'edit';
  return (
    <SectionCard title={tSections('photosTitle')} description={tSections('photosDescription')}>
      {isEdit && listingId ? (
        <ExistingImagesGrid
          listingId={listingId}
          images={existingImages}
          onChange={onExistingImagesChange}
        />
      ) : null}
      <ImageUploader onReadyFilesChange={onReadyFilesChange} />
    </SectionCard>
  );
}
