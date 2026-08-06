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

/**
 * Sniff the first bytes of an upload to confirm it's actually the image format
 * the client claims. The client-supplied `Content-Type` is trusted nowhere
 * else; without this check a `.html` or `.svg` file could be uploaded as
 * `image/jpeg` and served by the bucket with that forged type.
 *
 * Returns `true` if `bytes` look like the declared `mime`.
 */
export function sniffImageMatchesMime(bytes: Uint8Array, mime: AllowedImageMime): boolean {
  if (bytes.length < 12) return false;
  const b = bytes;
  switch (mime) {
    // SOI marker.
    case 'image/jpeg':
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    // \x89 P N G \r \n \x1a \n
    case 'image/png':
      return (
        b[0] === 0x89 &&
        b[1] === 0x50 &&
        b[2] === 0x4e &&
        b[3] === 0x47 &&
        b[4] === 0x0d &&
        b[5] === 0x0a &&
        b[6] === 0x1a &&
        b[7] === 0x0a
      );
    // RIFF....WEBP
    case 'image/webp':
      return (
        b[0] === 0x52 &&
        b[1] === 0x49 &&
        b[2] === 0x46 &&
        b[3] === 0x46 &&
        b[8] === 0x57 &&
        b[9] === 0x45 &&
        b[10] === 0x42 &&
        b[11] === 0x50
      );
    // ISO BMFF container with `ftyp` brand at offset 4-7, then a brand box
    // containing `avif` or `avis` (image sequence) somewhere in the first 32
    // bytes. Lighter check: bytes 4-7 == 'ftyp' AND bytes 8-11 in known AVIF
    // brand set.
    case 'image/avif': {
      const ftyp = b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70;
      if (!ftyp) return false;
      const brand = String.fromCharCode(b[8]!, b[9]!, b[10]!, b[11]!);
      return brand === 'avif' || brand === 'avis' || brand === 'mif1' || brand === 'msf1';
    }
  }
}

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

  const buffer = Buffer.from(await file.arrayBuffer());

  // Reject if the actual bytes don't match the declared MIME — defends against
  // an HTML/SVG payload uploaded as `image/jpeg` and then served by the bucket
  // with that forged Content-Type.
  if (!sniffImageMatchesMime(buffer, file.type)) {
    throw new Error(`File bytes do not match declared MIME type "${file.type}"`);
  }

  const objectKey = buildImageObjectKey(listingId, file.type);

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
