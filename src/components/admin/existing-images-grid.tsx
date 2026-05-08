'use client';

import { Button } from '@/components/ui/button';
import { IconLoader2, IconTrash } from '@tabler/icons-react';
import Image from 'next/image';
import { useState } from 'react';

type ExistingImage = {
  id: string;
  url: string;
};

type ExistingImagesGridProps = {
  listingId: string;
  images: ExistingImage[];
  onChange: (next: ExistingImage[]) => void;
};

export function ExistingImagesGrid({ listingId, images, onChange }: ExistingImagesGridProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (images.length === 0) return null;

  const onDelete = async (img: ExistingImage) => {
    if (deletingId) return;
    setError(null);
    setDeletingId(img.id);
    try {
      const res = await fetch(`/api/admin/listings/${listingId}/images/${img.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Delete failed (${res.status})`);
      }
      onChange(images.filter((i) => i.id !== img.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete photo');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Current photos
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
                  alt={`Photo ${idx + 1}`}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
                {idx === 0 && (
                  <span className="bg-primary absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-medium text-white">
                    Cover
                  </span>
                )}
                {isDeleting ? (
                  <div className="absolute inset-0 grid place-items-center bg-black/40 text-white">
                    <IconLoader2 size={20} className="animate-spin" aria-hidden />
                  </div>
                ) : null}
              </div>
              <div className="p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(img)}
                  disabled={isDeleting}
                  className="w-full gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <IconTrash size={14} />
                  Remove
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
