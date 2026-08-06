'use client';
// Client component: handles file picking, client-side compression, thumb grid.
// Owns internal state via use-image-uploader; parent receives only the ready
// File[] in order, so it can submit them after listing creation.

import { Button } from '@/components/ui/button';
import { useImageUploader } from '@/hooks/use-image-uploader';
import { formatBytes, MAX_UPLOAD_BYTES } from '@/lib/image-compression';
import { cn } from '@/lib/utils';
import { IconCamera, IconLoader2, IconPhoto, IconPlus, IconX } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

type ImageUploaderProps = {
  /** Called whenever the set of ready files changes (in display order). */
  onReadyFilesChange: (files: File[]) => void;
  maxFiles?: number;
};

export function ImageUploader({ onReadyFilesChange, maxFiles }: ImageUploaderProps) {
  const t = useTranslations('admin.imageUploader');
  const {
    inputId,
    inputRef,
    items,
    dragOver,
    setDragOver,
    atLimit,
    maxFiles: effectiveMaxFiles,
    onSelect,
    onDrop,
    onRemove,
  } = useImageUploader({ onReadyFilesChange, maxFiles });

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          if (!atLimit) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={atLimit ? undefined : onDrop}
        className={cn(
          'border-border bg-background relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors',
          'hover:bg-accent/40',
          dragOver && 'border-primary bg-accent/60',
          atLimit && 'cursor-not-allowed opacity-50',
        )}
      >
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
          multiple
          className="sr-only"
          onChange={onSelect}
          disabled={atLimit}
        />
        <div className="bg-accent grid h-12 w-12 place-items-center rounded-full">
          <IconCamera size={24} className="text-primary" aria-hidden />
        </div>
        <div className="text-sm font-medium">{atLimit ? t('atLimit') : t('addPhotos')}</div>
        <div className="text-foreground-muted text-xs">
          {t('formats', { size: formatBytes(MAX_UPLOAD_BYTES) })}
        </div>
        <div className="text-foreground-muted text-xs tabular-nums">
          {t('photoCount', { count: items.length, max: effectiveMaxFiles })}
        </div>
      </label>

      {items.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((img, idx) => (
            <li
              key={img.id}
              className="border-border bg-background relative overflow-hidden rounded-lg border"
            >
              <div className="bg-accent relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.previewUrl}
                  alt={t('photoAlt', { index: idx + 1 })}
                  className="h-full w-full object-cover"
                />
                {idx === 0 && (
                  <span className="bg-primary absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-medium text-white">
                    {t('cover')}
                  </span>
                )}
                {img.status === 'compressing' && (
                  <div className="absolute inset-0 grid place-items-center bg-black/40 text-white">
                    <IconLoader2 size={20} className="animate-spin" aria-hidden />
                  </div>
                )}
                {img.status === 'error' && (
                  <div className="absolute inset-0 grid place-items-center bg-black/60 px-2 text-center text-xs text-white">
                    {img.errorMessage}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(img.id)}
                  aria-label={t('removePhoto', { index: idx + 1 })}
                  className="text-foreground absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 hover:bg-white"
                >
                  <IconX size={14} />
                </button>
              </div>
              <div className="p-2 text-xs">
                <div className="flex items-center justify-between gap-2 tabular-nums">
                  <span className="text-foreground-muted">{formatBytes(img.originalBytes)}</span>
                  {img.status === 'ready' && (
                    <>
                      <span className="text-foreground-muted">→</span>
                      <span className="font-medium">{formatBytes(img.compressedBytes)}</span>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
          {!atLimit && (
            <li>
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                className="flex h-full min-h-[140px] w-full flex-col items-center justify-center gap-1"
              >
                <IconPlus size={20} />
                <span className="text-xs">{t('addMore')}</span>
              </Button>
            </li>
          )}
        </ul>
      )}

      {items.length === 0 && (
        <p className="text-foreground-muted flex items-start gap-2 text-xs">
          <IconPhoto size={14} className="mt-0.5 shrink-0" aria-hidden />
          <span>{t('recommended')}</span>
        </p>
      )}
    </div>
  );
}
