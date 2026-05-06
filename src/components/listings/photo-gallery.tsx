'use client';
// Client component: triggers the lightbox dialog and handles keyboard nav.

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { usePhotoLightbox } from '@/hooks/use-photo-lightbox';
import { cn } from '@/lib/utils';
import { IconChevronLeft, IconChevronRight, IconPhoto } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

type PhotoGalleryProps = {
  photos: string[];
  alt: string;
};

const MAX_GRID_PHOTOS = 5;

export function PhotoGallery({ photos, alt }: PhotoGalleryProps) {
  const t = useTranslations('detail');
  const { open, setOpen, index, total, openAt, next, prev } = usePhotoLightbox(photos.length);

  if (photos.length === 0) return null;
  const cover = photos[0];
  const grid = photos.slice(1, MAX_GRID_PHOTOS);

  return (
    <>
      {/* Mobile: horizontal carousel */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 md:hidden">
        {photos.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            onClick={() => openAt(i)}
            className="bg-accent relative aspect-4/3 w-[88vw] shrink-0 snap-start overflow-hidden rounded-lg"
            aria-label={`${alt} ${i + 1}`}
          >
            <Image
              src={src}
              alt={alt}
              fill
              sizes="88vw"
              className="object-cover"
              priority={i === 0}
            />
          </button>
        ))}
      </div>

      {/* Desktop: hero + 4-image grid */}
      <div className="hidden md:block">
        <div className="grid aspect-2/1 grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl">
          <button
            type="button"
            onClick={() => openAt(0)}
            className="bg-accent focus-visible:ring-primary relative col-span-2 row-span-2 overflow-hidden focus-visible:ring-2 focus-visible:outline-none"
            aria-label={`${alt} 1`}
          >
            {cover ? (
              <Image
                src={cover}
                alt={alt}
                fill
                sizes="(min-width: 1280px) 50vw, 60vw"
                className="object-cover transition-transform hover:scale-105"
                priority
              />
            ) : null}
          </button>

          {grid.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => openAt(i + 1)}
              className={cn(
                'bg-accent focus-visible:ring-primary relative overflow-hidden focus-visible:ring-2 focus-visible:outline-none',
              )}
              aria-label={`${alt} ${i + 2}`}
            >
              <Image
                src={src}
                alt={alt}
                fill
                sizes="(min-width: 1280px) 25vw, 30vw"
                className="object-cover transition-transform hover:scale-105"
              />
            </button>
          ))}
        </div>

        <div className="mt-3 flex justify-end">
          <Button variant="outline" onClick={() => openAt(0)} className="gap-2">
            <IconPhoto size={16} />
            {t('showAllPhotos')} · {total}
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="bg-black/95 sm:h-[100dvh] sm:max-h-[100dvh] sm:max-w-none sm:rounded-none"
          aria-label={alt}
        >
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('photoCount', { current: index + 1, total })}
          </DialogDescription>
          <div className="relative flex h-full w-full items-center justify-center">
            <button
              type="button"
              onClick={prev}
              aria-label={t('previousPhoto')}
              className="absolute left-4 z-10 grid h-12 w-12 place-items-center rounded-full bg-white/90 hover:bg-white"
            >
              <IconChevronLeft size={20} />
            </button>

            <div className="relative h-full w-full">
              {photos[index] ? (
                <Image
                  key={photos[index]}
                  src={photos[index]}
                  alt={alt}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  priority
                />
              ) : null}
            </div>

            <button
              type="button"
              onClick={next}
              aria-label={t('nextPhoto')}
              className="absolute right-4 z-10 grid h-12 w-12 place-items-center rounded-full bg-white/90 hover:bg-white"
            >
              <IconChevronRight size={20} />
            </button>

            <div
              className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-sm text-white tabular-nums"
              aria-live="polite"
            >
              {t('photoCount', { current: index + 1, total })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
