import { requireAdmin } from '@/lib/admin-auth';
import { recordAdminLog } from '@/lib/admin-log';
import {
  apiBadRequest,
  apiBadRequestRaw,
  apiNotFound,
  apiOk,
  apiServerError,
} from '@/lib/api/api-response';
import { revalidateListingSurfaces } from '@/lib/api/revalidate-listings';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  isAllowedMime,
  uploadListingImage,
} from '@/lib/storage';
import { after } from 'next/server';
import { z } from 'zod';

type Context = { params: Promise<{ id: string }> };

const fileFieldSchema = z.custom<File>(
  (val) => typeof val === 'object' && val !== null && 'arrayBuffer' in val && 'type' in val,
  { message: 'Expected a file' },
);

/**
 * POST /api/admin/listings/:id/images
 *
 * multipart/form-data, field name "files" — repeat for multiple uploads.
 * Each file is validated, uploaded to the `listings` bucket, then an Image
 * row is inserted with `order` continuing from the existing max.
 */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const listing = await prisma.listing.findUnique({ where: { id }, select: { slug: true } });
  if (!listing) return apiNotFound(`Listing "${id}" not found`);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiBadRequestRaw('Could not parse multipart body');
  }

  const files = form.getAll('files');
  if (files.length === 0) {
    return new Response(
      JSON.stringify({ error: { message: 'No files provided (use field name "files")' } }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  // Validate each file before any uploads — fail fast on the whole batch.
  for (const f of files) {
    const parsed = fileFieldSchema.safeParse(f);
    if (!parsed.success) return apiBadRequest(parsed.error);
    const file = parsed.data;
    if (!isAllowedMime(file.type)) {
      return new Response(
        JSON.stringify({
          error: {
            message: `Unsupported MIME type: ${file.type}`,
            allowed: ALLOWED_IMAGE_MIME_TYPES,
          },
        }),
        { status: 415, headers: { 'content-type': 'application/json' } },
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return new Response(
        JSON.stringify({
          error: { message: `File "${file.name}" exceeds ${MAX_IMAGE_BYTES} bytes` },
        }),
        { status: 413, headers: { 'content-type': 'application/json' } },
      );
    }
  }

  try {
    const startingOrder = await prisma.image.aggregate({
      where: { listingId: id },
      _max: { order: true },
    });
    const nextOrder = (startingOrder._max.order ?? -1) + 1;

    // Storage uploads run concurrently, then ONE insert for all rows —
    // the old per-file loop paid 2×N sequential round-trips.
    const uploads = await Promise.all(
      files.map(async (f, i) => {
        const file = f as File;
        const uploaded = await uploadListingImage({
          listingId: id,
          file: { type: file.type, size: file.size, arrayBuffer: () => file.arrayBuffer() },
        });
        return {
          listingId: id,
          url: uploaded.publicUrl,
          order: nextOrder + i,
          alt: file.name || null,
        };
      }),
    );
    const created = await prisma.image.createManyAndReturn({ data: uploads });

    after(() =>
      recordAdminLog({
        action: 'listing.images.upload',
        target: id,
        metadata: { count: created.length },
      }),
    );
    revalidateListingSurfaces(listing.slug);
    return apiOk({ data: created }, { status: 201 });
  } catch (err) {
    logger.error(`POST /api/admin/listings/${id}/images failed`, { err });
    return apiServerError('Upload failed');
  }
}
