import { recordAdminLog } from '@/lib/admin-log';
import {
  apiBadRequest,
  apiBadRequestRaw,
  apiNotFound,
  apiOk,
  apiServerError,
  apiServiceUnavailable,
} from '@/lib/api/api-response';
import { revalidateListingSurfaces } from '@/lib/api/revalidate-listings';
import { requireAdmin, requireSameOrigin } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_FILES_PER_REQUEST,
  MAX_IMAGES_PER_LISTING,
  MAX_IMAGE_BYTES,
  isAllowedMime,
  uploadListingImage,
} from '@/lib/storage';
import { StorageConfigError } from '@/lib/supabase-admin';
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
  // CSRF: Auth.js protects its own endpoints; every other user-initiated
  // mutation opts in here explicitly.
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  // `force` skips the strict-check caches: a suspension that applies to the
  // next read but not the next write is not a suspension.
  const auth = await requireAdmin(request, { force: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  // Guarded: an unhandled throw here (dead pool, missing DATABASE_URL) escaped
  // the handler and answered a body-less 500, so the admin UI could only report
  // "upload failed" with no reason to act on.
  let listing: { slug: string } | null;
  try {
    listing = await prisma.listing.findUnique({ where: { id }, select: { slug: true } });
  } catch (err) {
    logger.error(`POST /api/admin/listings/${id}/images lookup failed`, { err });
    return apiServerError(
      `Could not load listing: ${err instanceof Error ? err.message : 'unknown error'}`,
    );
  }
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
  // Per-request cap. The byte cap alone bounds one file; without this, one
  // request can still carry hundreds of them.
  if (files.length > MAX_FILES_PER_REQUEST) {
    return apiBadRequestRaw(`At most ${MAX_FILES_PER_REQUEST} files per request`);
  }

  // Per-listing cap, counted across every moderation state — a pending-add
  // photo occupies a slot just as much as a live one.
  const existingCount = await prisma.image.count({ where: { listingId: id } });
  if (existingCount + files.length > MAX_IMAGES_PER_LISTING) {
    return apiBadRequestRaw(
      `A listing can hold at most ${MAX_IMAGES_PER_LISTING} images (currently ${existingCount})`,
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
        actor: auth.user,
        action: 'listing.images.upload',
        target: id,
        metadata: { count: created.length },
      }),
    );
    revalidateListingSurfaces(listing.slug);
    return apiOk({ data: created }, { status: 201 });
  } catch (err) {
    logger.error(`POST /api/admin/listings/${id}/images failed`, { err });
    // Admin-only endpoint behind auth — surface the real reason. A bare
    // "Upload failed" turned a missing env var into a blind investigation.
    if (err instanceof StorageConfigError) {
      return apiServiceUnavailable(`Image storage is not configured: ${err.message}`);
    }
    return apiServerError(`Upload failed: ${err instanceof Error ? err.message : 'unknown error'}`);
  }
}
