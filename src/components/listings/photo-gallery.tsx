'use client';
// Client component: triggers the lightbox dialog and handles keyboard nav.

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { usePhotoLightbox } from '@/hooks/use-photo-lightbox';
import { cn } from '@/lib/utils';
import { IconChevronLeft, IconChevronRight, IconPhoto, IconX } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

type PhotoGalleryProps = {
  photos: string[];
  alt: string;
};

const GRID_SLOTS = 4;

export function PhotoGallery({ photos, alt }: PhotoGalleryProps) {
  const t = useTranslations('detail');
  const { open, setOpen, index, total, openAt, next, prev } = usePhotoLightbox(photos.length);

  if (photos.length === 0) return null;
  const cover = photos[0];
  const gridSlots = Array.from({ length: GRID_SLOTS }, (_, i) => photos[i + 1]);

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

      {/* Desktop: 1 hero + 2x2 grid, fixed height */}
      <div className="hidden md:block">
        <div className="relative h-130 overflow-hidden rounded-xl">
          <div className="grid h-full grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => openAt(0)}
              className="bg-accent focus-visible:ring-primary group relative h-full w-full overflow-hidden focus-visible:ring-2 focus-visible:outline-none"
              aria-label={`${alt} 1`}
            >
              {cover ? (
                <Image
                  src={cover}
                  alt={alt}
                  fill
                  sizes="(min-width: 1280px) 50vw, 60vw"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  priority
                />
              ) : null}
            </button>

            <div className="grid grid-cols-2 grid-rows-2 gap-1">
              {gridSlots.map((src, i) =>
                src ? (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    onClick={() => openAt(i + 1)}
                    className={cn(
                      'bg-accent focus-visible:ring-primary group relative h-full w-full overflow-hidden focus-visible:ring-2 focus-visible:outline-none',
                    )}
                    aria-label={`${alt} ${i + 2}`}
                  >
                    <Image
                      src={src}
                      alt={alt}
                      fill
                      sizes="25vw"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </button>
                ) : (
                  <div key={`empty-${i}`} className="bg-accent h-full w-full" aria-hidden />
                ),
              )}
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => openAt(0)}
            className="border-border/60 absolute right-4 bottom-4 gap-2 bg-white/80 text-black shadow-sm backdrop-blur-sm hover:bg-white"
          >
            <IconPhoto size={16} />
            {t('showAllPhotos')} · {total}
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          hideClose
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
              onClick={() => setOpen(false)}
              aria-label={t('closePhoto')}
              className="absolute top-4 right-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-black hover:bg-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              <IconX size={20} />
            </button>

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
