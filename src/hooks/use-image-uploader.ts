'use client';

import { compressImage } from '@/lib/image-compression';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

export type ImageUploadItem = {
  id: string;
  file: File;
  previewUrl: string;
  originalBytes: number;
  compressedBytes: number;
  status: 'compressing' | 'ready' | 'error';
  errorMessage?: string;
};

type UseImageUploaderArgs = {
  onReadyFilesChange: (files: File[]) => void;
  maxFiles?: number | undefined;
};

const DEFAULT_MAX_FILES = 12;

export function useImageUploader({
  onReadyFilesChange,
  maxFiles = DEFAULT_MAX_FILES,
}: UseImageUploaderArgs) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ImageUploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // Notify parent whenever the ready set changes.
  useEffect(() => {
    onReadyFilesChange(items.filter((i) => i.status === 'ready').map((i) => i.file));
  }, [items, onReadyFilesChange]);

  // Snapshot items so the unmount cleanup can revoke object URLs without
  // triggering a state update on an unmounted component.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Track mount state so in-flight compressions don't call setItems after
  // unmount. Browsers warn ("Can't perform state update on unmounted...") and
  // worse, this can leak the file blobs we just allocated.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      for (const i of itemsRef.current) URL.revokeObjectURL(i.previewUrl);
    };
  }, []);

  const remaining = Math.max(0, maxFiles - items.length);
  const atLimit = remaining === 0;

  const processFiles = useCallback(
    async (files: File[]) => {
      const accepted = files.slice(0, remaining);
      if (accepted.length === 0) return;

      const placeholders: ImageUploadItem[] = accepted.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        originalBytes: file.size,
        compressedBytes: 0,
        status: 'compressing',
      }));
      setItems((prev) => [...prev, ...placeholders]);

      await Promise.all(
        placeholders.map(async (placeholder) => {
          try {
            const result = await compressImage(placeholder.file);
            if (!isMountedRef.current) return;
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
            if (!isMountedRef.current) return;
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

  const onSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const list = event.target.files;
      if (!list) return;
      void processFiles(Array.from(list));
      event.target.value = '';
    },
    [processFiles],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      setDragOver(false);
      const list = event.dataTransfer.files;
      if (!list) return;
      void processFiles(Array.from(list));
    },
    [processFiles],
  );

  const onRemove = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((it) => it.id !== id);
    });
  }, []);

  return {
    inputId,
    inputRef,
    items,
    dragOver,
    setDragOver,
    remaining,
    atLimit,
    maxFiles,
    onSelect,
    onDrop,
    onRemove,
  };
}
