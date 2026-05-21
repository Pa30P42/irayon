'use client';

import { ExistingImagesGrid } from '@/components/admin/existing-images-grid';
import { ImageUploader } from '@/components/admin/image-uploader';
import { SectionCard } from '@/components/ui/section-card';

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
  const isEdit = mode === 'edit';
  return (
    <SectionCard
      title="Photos"
      description="Tap to add photos from your phone. We'll compress them automatically without losing quality."
    >
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
