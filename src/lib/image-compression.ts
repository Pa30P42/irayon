import imageCompression from 'browser-image-compression';

/** 5 MB matches the storage bucket limit (and the API's MAX_IMAGE_BYTES). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Long-edge cap. 2560 px is generous for any retina display. */
const MAX_DIMENSION = 2560;
const QUALITY = 0.85;

const SUPPORTED_INPUT_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  // We accept HEIC at the input boundary even though the bucket rejects it,
  // because phones produce it; browser-image-compression transcodes to JPEG.
  'image/heic',
  'image/heif',
]);

export type CompressionResult = {
  file: File;
  originalBytes: number;
  compressedBytes: number;
  ratio: number;
};

export type CompressionProgress = {
  filename: string;
  step: 'compressing' | 'done';
  progress: number; // 0..100
};

/**
 * Compresses an image client-side. Output is always JPEG to keep the
 * bucket-side MIME allowlist small (jpeg/png/webp/avif) and to reliably
 * undercut the 5 MB limit on phone-camera uploads.
 *
 * Visually lossless at quality=0.85, max-edge=2560 — phone cameras output
 * 12–48 MP; downsampling to 2560 keeps detail far beyond display needs.
 */
export async function compressImage(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<CompressionResult> {
  if (!SUPPORTED_INPUT_MIME.has(file.type)) {
    throw new Error(`Unsupported image type: ${file.type || 'unknown'}`);
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: MAX_UPLOAD_BYTES / 1024 / 1024,
    maxWidthOrHeight: MAX_DIMENSION,
    initialQuality: QUALITY,
    useWebWorker: true,
    fileType: 'image/jpeg',
    onProgress: (pct) => onProgress?.(pct),
  });

  // The library may return a Blob in some env shims — wrap as File so the
  // server-side multipart handler always sees a proper filename.
  const safeFile =
    compressed instanceof File
      ? compressed
      : new File([compressed], renameToJpg(file.name), { type: 'image/jpeg' });

  if (safeFile.size > MAX_UPLOAD_BYTES) {
    throw new Error(`Could not compress "${file.name}" below ${formatBytes(MAX_UPLOAD_BYTES)}`);
  }

  return {
    file: safeFile,
    originalBytes: file.size,
    compressedBytes: safeFile.size,
    ratio: file.size === 0 ? 0 : safeFile.size / file.size,
  };
}

const renameToJpg = (name: string): string => name.replace(/\.[^./\\]+$/, '') + '.jpg';

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
