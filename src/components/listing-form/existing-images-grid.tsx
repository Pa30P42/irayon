'use client';

import type { ListingEndpoints } from '@/components/listing-form/endpoints';
import { Button } from '@/components/ui/button';
import { useDeleteListingImage } from '@/hooks/use-delete-listing-image';
import { useReorderListingImages } from '@/hooks/use-reorder-listing-images';
import {
  IconArrowLeft,
  IconArrowRight,
  IconLoader2,
  IconStar,
  IconTrash,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useState } from 'react';

type ExistingImage = {
  id: string;
  url: string;
};

type ExistingImagesGridProps = {
  listingId: string;
  /** Which cabinet's API to hit — see `endpoints.ts`. */
  endpoints: ListingEndpoints;
  images: ExistingImage[];
  onChange: (next: ExistingImage[]) => void;
};

export function ExistingImagesGrid({
  listingId,
  endpoints,
  images,
  onChange,
}: ExistingImagesGridProps) {
  const t = useTranslations('admin.existingImages');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deleteImage = useDeleteListingImage();
  const reorder = useReorderListingImages();

  if (images.length === 0) return null;

  const onDelete = (img: ExistingImage) => {
    if (deletingId) return;
    setError(null);
    setDeletingId(img.id);
    deleteImage.mutate(
      { listingId, imageId: img.id, endpoints },
      {
        onSuccess: () => onChange(images.filter((i) => i.id !== img.id)),
        onError: (err) => setError(err instanceof Error ? err.message : t('removeFailed')),
        onSettled: () => setDeletingId(null),
      },
    );
  };

  // Optimistic reorder: apply locally, revert on server failure.
  const commitOrder = (next: ExistingImage[]) => {
    if (reorder.isPending) return;
    setError(null);
    const previous = images;
    onChange(next);
    reorder.mutate(
      { listingId, order: next.map((i) => i.id), endpoints },
      {
        onError: (err) => {
          onChange(previous);
          setError(err instanceof Error ? err.message : t('reorderFailed'));
        },
      },
    );
  };

  const makeCover = (index: number) => {
    if (index === 0) return;
    const next = [...images];
    const [img] = next.splice(index, 1);
    next.unshift(img!);
    commitOrder(next);
  };

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const a = next[index]!;
    next[index] = next[target]!;
    next[target] = a;
    commitOrder(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {t('current')}
          <span className="text-foreground-muted ml-2 text-xs font-normal">({images.length})</span>
        </p>
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((img, idx) => {
          const isDeleting = deletingId === img.id;
          return (
            <li
              key={img.id}
              className="border-border bg-background relative overflow-hidden rounded-lg border"
            >
              <div className="bg-accent relative aspect-square">
                <Image
                  src={img.url}
                  alt={t('photoAlt', { index: idx + 1 })}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
                {idx === 0 && (
                  <span className="bg-primary absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-medium text-white">
                    {t('cover')}
                  </span>
                )}
                {isDeleting ? (
                  <div className="absolute inset-0 grid place-items-center bg-black/40 text-white">
                    <IconLoader2 size={20} className="animate-spin" aria-hidden />
                  </div>
                ) : null}
              </div>
              <div className="space-y-1.5 p-2">
                <div className="flex items-center justify-between gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0 || reorder.isPending}
                    aria-label={t('moveEarlier')}
                    className="h-8 w-8 p-0"
                  >
                    <IconArrowLeft size={14} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => makeCover(idx)}
                    disabled={idx === 0 || reorder.isPending}
                    aria-label={t('makeCover')}
                    className="h-8 flex-1 gap-1 px-1 text-xs"
                  >
                    <IconStar size={13} />
                    {t('makeCover')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => move(idx, 1)}
                    disabled={idx === images.length - 1 || reorder.isPending}
                    aria-label={t('moveLater')}
                    className="h-8 w-8 p-0"
                  >
                    <IconArrowRight size={14} />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="destructiveGhost"
                  size="sm"
                  onClick={() => onDelete(img)}
                  disabled={isDeleting}
                  className="w-full gap-1.5"
                >
                  <IconTrash size={14} />
                  {t('remove')}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
