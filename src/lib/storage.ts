import { getSupabaseAdmin } from './supabase-admin';

export const STORAGE_BUCKET = 'listings';

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB; mirrors the bucket's limit.

const EXTENSION_BY_MIME: Record<AllowedImageMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export const isAllowedMime = (value: string): value is AllowedImageMime =>
  (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(value);

/** Builds the storage object key: `{listingId}/{uuid}.{ext}`. */
export function buildImageObjectKey(listingId: string, mime: AllowedImageMime): string {
  const ext = EXTENSION_BY_MIME[mime];
  const id = crypto.randomUUID();
  return `${listingId}/${id}.${ext}`;
}

/** Public URL for an object in the public `listings` bucket. */
export function publicUrlFor(objectKey: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${STORAGE_BUCKET}/${objectKey}`;
}

/**
 * Reverses `publicUrlFor`. Returns the object key if the URL points at this
 * bucket, otherwise null — used by the delete handler so it only removes its
 * own files (and doesn't try to delete external Unsplash URLs).
 */
export function objectKeyFromPublicUrl(url: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const prefix = `${base.replace(/\/$/, '')}/storage/v1/object/public/${STORAGE_BUCKET}/`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}

export type UploadInput = {
  listingId: string;
  file: { arrayBuffer: () => Promise<ArrayBuffer>; type: string; size: number };
};

export type UploadResult = {
  objectKey: string;
  publicUrl: string;
  mime: AllowedImageMime;
  bytes: number;
};

export async function uploadListingImage(input: UploadInput): Promise<UploadResult> {
  const { listingId, file } = input;
  if (!isAllowedMime(file.type)) {
    throw new Error(`Unsupported MIME type: ${file.type}`);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`File exceeds ${MAX_IMAGE_BYTES} bytes`);
  }

  const objectKey = buildImageObjectKey(listingId, file.type);
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await getSupabaseAdmin()
    .storage.from(STORAGE_BUCKET)
    .upload(objectKey, buffer, {
      contentType: file.type,
      cacheControl: '31536000', // 1 year — paths are content-addressed via UUID.
      upsert: false,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  return {
    objectKey,
    publicUrl: publicUrlFor(objectKey),
    mime: file.type,
    bytes: file.size,
  };
}

/** No-op when the URL doesn't belong to this bucket — safe to call on any Image row. */
export async function deleteListingImageByUrl(url: string): Promise<{ deleted: boolean }> {
  const key = objectKeyFromPublicUrl(url);
  if (!key) return { deleted: false };
  const { error } = await getSupabaseAdmin().storage.from(STORAGE_BUCKET).remove([key]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
  return { deleted: true };
}
