'use client';
// Client component: handles file picking, client-side compression, thumb grid.
// Owns internal state (one entry per file with status); parent receives only
// the ready File[] in order, so it can submit them after listing creation.

import { Button } from '@/components/ui/button';
import { compressImage, formatBytes, MAX_UPLOAD_BYTES } from '@/lib/image-compression';
import { cn } from '@/lib/utils';
import { IconCamera, IconLoader2, IconPhoto, IconPlus, IconX } from '@tabler/icons-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

type Item = {
  id: string;
  file: File;
  previewUrl: string;
  originalBytes: number;
  compressedBytes: number;
  status: 'compressing' | 'ready' | 'error';
  errorMessage?: string;
};

type ImageUploaderProps = {
  /** Called whenever the set of ready files changes (in display order). */
  onReadyFilesChange: (files: File[]) => void;
  maxFiles?: number;
};

const DEFAULT_MAX_FILES = 12;

export function ImageUploader({
  onReadyFilesChange,
  maxFiles = DEFAULT_MAX_FILES,
}: ImageUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // Notify parent whenever the ready set changes; parent never has to know
  // about compression internals.
  useEffect(() => {
    onReadyFilesChange(items.filter((i) => i.status === 'ready').map((i) => i.file));
  }, [items, onReadyFilesChange]);

  // Revoke object URLs on unmount to avoid leaks.
  useEffect(() => {
    return () => {
      setItems((prev) => {
        prev.forEach((i) => URL.revokeObjectURL(i.previewUrl));
        return [];
      });
    };
  }, []);

  const remaining = Math.max(0, maxFiles - items.length);
  const atLimit = remaining === 0;

  const processFiles = useCallback(
    async (files: File[]) => {
      const accepted = files.slice(0, remaining);
      if (accepted.length === 0) return;

      const placeholders: Item[] = accepted.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        originalBytes: file.size,
        compressedBytes: 0,
        status: 'compressing',
      }));
      setItems((prev) => [...prev, ...placeholders]);

      // Run compressions in parallel; each settles its own row independently.
      await Promise.all(
        placeholders.map(async (placeholder) => {
          try {
            const result = await compressImage(placeholder.file);
            setItems((prev) =>
              prev.map((it) =>
                it.id === placeholder.id
                  ? {
                      ...it,
                      file: result.file,
                      compressedBytes: result.compressedBytes,
                      status: 'ready' as const,
                    }
                  : it,
              ),
            );
          } catch (err) {
            setItems((prev) =>
              prev.map((it) =>
                it.id === placeholder.id
                  ? {
                      ...it,
                      status: 'error' as const,
                      errorMessage: err instanceof Error ? err.message : 'Compression failed',
                    }
                  : it,
              ),
            );
          }
        }),
      );
    },
    [remaining],
  );

  const onSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const list = event.target.files;
    if (!list) return;
    void processFiles(Array.from(list));
    event.target.value = '';
  };

  const onDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragOver(false);
    const list = event.dataTransfer.files;
    if (!list) return;
    void processFiles(Array.from(list));
  };

  const onRemove = (id: string) => {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((it) => it.id !== id);
    });
  };

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
          capture="environment"
          className="sr-only"
          onChange={onSelect}
          disabled={atLimit}
        />
        <div className="bg-accent grid h-12 w-12 place-items-center rounded-full">
          <IconCamera size={24} className="text-primary" aria-hidden />
        </div>
        <div className="text-sm font-medium">
          {atLimit ? 'Maximum reached' : 'Tap to add photos or drop them here'}
        </div>
        <div className="text-foreground-muted text-xs">
          JPEG · PNG · WebP · HEIC · max {formatBytes(MAX_UPLOAD_BYTES)} each (auto-compressed)
        </div>
        <div className="text-foreground-muted text-xs tabular-nums">
          {items.length} / {maxFiles} photos
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
                  alt={`Photo ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
                {idx === 0 && (
                  <span className="bg-primary absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-medium text-white">
                    Cover
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
                  aria-label={`Remove photo ${idx + 1}`}
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
                <span className="text-xs">Add more</span>
              </Button>
            </li>
          )}
        </ul>
      )}

      {items.length === 0 && (
        <p className="text-foreground-muted flex items-start gap-2 text-xs">
          <IconPhoto size={14} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            The first photo becomes the cover. 3+ photos recommended for guests to picture the
            place.
          </span>
        </p>
      )}
    </div>
  );
}
