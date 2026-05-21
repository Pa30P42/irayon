import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const upload = vi.fn();
const remove = vi.fn();
const fromMock = vi.fn(() => ({ upload, remove }));

vi.mock('./supabase-admin', () => ({
  getSupabaseAdmin: () => ({ storage: { from: fromMock } }),
}));

import {
  ALLOWED_IMAGE_MIME_TYPES,
  buildImageObjectKey,
  deleteListingImageByUrl,
  isAllowedMime,
  objectKeyFromPublicUrl,
  publicUrlFor,
  sniffImageMatchesMime,
  STORAGE_BUCKET,
  uploadListingImage,
  type AllowedImageMime,
} from './storage';

// Valid 16-byte magic-byte headers per MIME — enough to pass `sniffImageMatchesMime`.
const MAGIC: Record<AllowedImageMime, Uint8Array> = {
  'image/jpeg': new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  'image/png': new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0,
  ]),
  'image/webp': new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0, 0, 0, 0,
  ]),
  'image/avif': new Uint8Array([
    0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66, 0, 0, 0, 0,
  ]),
};

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  upload.mockReset();
  remove.mockReset();
  fromMock.mockClear();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('isAllowedMime', () => {
  it('allows the four image formats and nothing else', () => {
    for (const m of ALLOWED_IMAGE_MIME_TYPES) expect(isAllowedMime(m)).toBe(true);
    expect(isAllowedMime('image/svg+xml')).toBe(false);
    expect(isAllowedMime('application/pdf')).toBe(false);
    expect(isAllowedMime('')).toBe(false);
  });
});

describe('buildImageObjectKey', () => {
  it('produces "{listingId}/{uuid}.{ext}" with the right extension per mime', () => {
    expect(buildImageObjectKey('lst123', 'image/jpeg')).toMatch(/^lst123\/[0-9a-f-]{36}\.jpg$/);
    expect(buildImageObjectKey('lst123', 'image/png')).toMatch(/\.png$/);
    expect(buildImageObjectKey('lst123', 'image/webp')).toMatch(/\.webp$/);
    expect(buildImageObjectKey('lst123', 'image/avif')).toMatch(/\.avif$/);
  });
});

describe('publicUrlFor / objectKeyFromPublicUrl', () => {
  it('roundtrips through the public bucket URL', () => {
    const key = 'lst123/abc.jpg';
    const url = publicUrlFor(key);
    expect(url).toBe(
      `https://example.supabase.co/storage/v1/object/public/${STORAGE_BUCKET}/${key}`,
    );
    expect(objectKeyFromPublicUrl(url)).toBe(key);
  });

  it('returns null for URLs that do not point at the bucket', () => {
    expect(objectKeyFromPublicUrl('https://images.unsplash.com/photo-1234')).toBeNull();
    expect(
      objectKeyFromPublicUrl('https://other.supabase.co/storage/v1/object/public/listings/x.jpg'),
    ).toBeNull();
  });
});

describe('sniffImageMatchesMime', () => {
  it('accepts each allowed mime when bytes match the magic header', () => {
    for (const mime of ALLOWED_IMAGE_MIME_TYPES) {
      expect(sniffImageMatchesMime(MAGIC[mime], mime)).toBe(true);
    }
  });

  it('rejects bytes that do not match the declared mime', () => {
    expect(sniffImageMatchesMime(MAGIC['image/png'], 'image/jpeg')).toBe(false);
    expect(sniffImageMatchesMime(MAGIC['image/webp'], 'image/png')).toBe(false);
  });

  it('rejects short inputs', () => {
    expect(sniffImageMatchesMime(new Uint8Array([0xff, 0xd8]), 'image/jpeg')).toBe(false);
  });
});

describe('uploadListingImage', () => {
  const mkFile = (
    overrides: Partial<{ type: AllowedImageMime; size: number; bytes: Uint8Array }> = {},
  ) => {
    const type = overrides.type ?? 'image/jpeg';
    const bytes = overrides.bytes ?? MAGIC[type];
    return {
      type: type as string,
      size: overrides.size ?? bytes.byteLength,
      arrayBuffer: async () => bytes.buffer.slice(0) as ArrayBuffer,
    };
  };

  it('rejects unsupported MIME types before calling Supabase', async () => {
    await expect(
      uploadListingImage({
        listingId: 'l1',
        file: { ...mkFile(), type: 'image/svg+xml' },
      }),
    ).rejects.toThrow(/Unsupported MIME type/);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('rejects oversize files before calling Supabase', async () => {
    await expect(
      uploadListingImage({ listingId: 'l1', file: mkFile({ size: 11 * 1024 * 1024 }) }),
    ).rejects.toThrow(/exceeds/);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('rejects when bytes do not match the declared MIME (forged Content-Type)', async () => {
    // Claim PNG, ship JPEG bytes.
    await expect(
      uploadListingImage({
        listingId: 'lst123',
        file: { ...mkFile({ type: 'image/jpeg' }), type: 'image/png' },
      }),
    ).rejects.toThrow(/do not match declared MIME/);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('uploads to the listings bucket and returns the public URL', async () => {
    upload.mockResolvedValueOnce({ error: null });

    const result = await uploadListingImage({
      listingId: 'lst123',
      file: mkFile({ type: 'image/png' }),
    });

    expect(fromMock).toHaveBeenCalledWith(STORAGE_BUCKET);
    expect(upload).toHaveBeenCalledTimes(1);
    const [key, , opts] = upload.mock.calls[0]!;
    expect(key).toMatch(/^lst123\/[0-9a-f-]{36}\.png$/);
    expect(opts).toMatchObject({ contentType: 'image/png', upsert: false });
    expect(
      result.publicUrl.startsWith('https://example.supabase.co/storage/v1/object/public/listings/'),
    ).toBe(true);
    expect(result.objectKey).toBe(key);
  });

  it('throws when Supabase reports an upload error', async () => {
    upload.mockResolvedValueOnce({ error: { message: 'permission denied' } });
    await expect(uploadListingImage({ listingId: 'lst123', file: mkFile() })).rejects.toThrow(
      /Storage upload failed: permission denied/,
    );
  });
});

describe('deleteListingImageByUrl', () => {
  it('is a no-op for URLs outside the bucket', async () => {
    const result = await deleteListingImageByUrl('https://images.unsplash.com/photo-x');
    expect(result).toEqual({ deleted: false });
    expect(remove).not.toHaveBeenCalled();
  });

  it('removes the matching object from the bucket', async () => {
    remove.mockResolvedValueOnce({ error: null });
    const url = publicUrlFor('lst123/abc.jpg');
    const result = await deleteListingImageByUrl(url);
    expect(result).toEqual({ deleted: true });
    expect(remove).toHaveBeenCalledWith(['lst123/abc.jpg']);
  });

  it('throws when Supabase reports a delete error', async () => {
    remove.mockResolvedValueOnce({ error: { message: 'not found' } });
    await expect(deleteListingImageByUrl(publicUrlFor('lst123/abc.jpg'))).rejects.toThrow(
      /Storage delete failed: not found/,
    );
  });
});
