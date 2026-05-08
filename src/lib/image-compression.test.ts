import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const compressionMock = vi.fn();

vi.mock('browser-image-compression', () => ({
  default: (...args: unknown[]) => compressionMock(...args),
}));

import { compressImage, formatBytes, MAX_UPLOAD_BYTES } from './image-compression';

const mkFile = (type: string, size = 1024, name = 'photo.jpg'): File =>
  // Use a fresh ArrayBuffer (not Uint8Array.buffer, which is ArrayBufferLike
  // and unhappy with the File constructor under strict lib types).
  new File([new ArrayBuffer(size)], name, { type, lastModified: 0 });

beforeEach(() => {
  compressionMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('formatBytes', () => {
  it('renders human-readable sizes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(2_500_000)).toBe('2.4 MB');
  });
});

describe('compressImage', () => {
  it('rejects unsupported MIME types before calling the library', async () => {
    await expect(compressImage(mkFile('image/svg+xml'))).rejects.toThrow(/Unsupported image type/);
    expect(compressionMock).not.toHaveBeenCalled();
  });

  it('returns the compressed File with size metadata', async () => {
    const out = new File([new Uint8Array(1500)], 'photo.jpg', { type: 'image/jpeg' });
    compressionMock.mockResolvedValueOnce(out);

    const result = await compressImage(mkFile('image/jpeg', 5000));
    expect(result.compressedBytes).toBe(1500);
    expect(result.originalBytes).toBe(5000);
    expect(result.ratio).toBeCloseTo(0.3, 1);
    expect(result.file.type).toBe('image/jpeg');
  });

  it('rewraps a Blob result as a File with .jpg extension', async () => {
    const blob = new Blob([new Uint8Array(800)], { type: 'image/jpeg' });
    compressionMock.mockResolvedValueOnce(blob);

    const result = await compressImage(mkFile('image/heic', 4000, 'photo.heic'));
    expect(result.file.name).toBe('photo.jpg');
    expect(result.file.type).toBe('image/jpeg');
  });

  it('throws when compression cannot get below the limit', async () => {
    const tooBig = new File([new ArrayBuffer(MAX_UPLOAD_BYTES + 1)], 'big.jpg', {
      type: 'image/jpeg',
    });
    compressionMock.mockResolvedValueOnce(tooBig);

    await expect(compressImage(mkFile('image/jpeg', MAX_UPLOAD_BYTES + 100))).rejects.toThrow(
      /Could not compress/,
    );
  });

  it('forwards onProgress to the underlying library', async () => {
    let captured: ((pct: number) => void) | undefined;
    compressionMock.mockImplementationOnce(
      async (_file: File, opts: { onProgress?: (n: number) => void }) => {
        captured = opts.onProgress;
        return new File([new Uint8Array(10)], 'photo.jpg', { type: 'image/jpeg' });
      },
    );

    const onProgress = vi.fn();
    await compressImage(mkFile('image/jpeg', 100), onProgress);
    captured?.(42);
    expect(onProgress).toHaveBeenCalledWith(42);
  });
});
