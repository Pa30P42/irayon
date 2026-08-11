import { recordAdminLog } from '@/lib/admin-log';
import {
  apiBadRequest,
  apiBadRequestRaw,
  apiOk,
  apiServerError,
  apiServiceUnavailable,
} from '@/lib/api/api-response';
import { nextImageState } from '@/lib/api/listing-moderation';
import { revalidateListingSurfaces } from '@/lib/api/revalidate-listings';
import { requireListingOwner, requireSameOrigin } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
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
 * POST /api/host/listings/:id/images
 *
 * Same pipeline as the admin route (magic-byte sniff → `sharp` re-encode that
 * strips EXIF/GPS → dimension cap → WebP), with one difference: the resulting
 * rows carry a DERIVED moderation state. A photo added to an already-approved
 * listing is `PENDING_ADD` and stays invisible until review.
 */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;

  const { id } = await params;
  const auth = await requireListingOwner(id, { force: true });
  if (!auth.ok) return auth.response;

  const rate = await checkRateLimit('imageUpload', auth.user.id);
  if (!rate.success) {
    return new Response(JSON.stringify({ error: { message: 'Too many uploads' } }), {
      status: 429,
      headers: { 'content-type': 'application/json', ...rateLimitHeaders(rate) },
    });
  }

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { slug: true, moderationStatus: true },
  });
  if (!listing) return apiBadRequestRaw('Not found');

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiBadRequestRaw('Could not parse multipart body');
  }

  const files = form.getAll('files');
  if (files.length === 0) {
    return apiBadRequestRaw('No files provided (use field name "files")');
  }
  if (files.length > MAX_FILES_PER_REQUEST) {
    return apiBadRequestRaw(`At most ${MAX_FILES_PER_REQUEST} files per request`);
  }

  const existingCount = await prisma.image.count({ where: { listingId: id } });
  if (existingCount + files.length > MAX_IMAGES_PER_LISTING) {
    return apiBadRequestRaw(
      `A listing can hold at most ${MAX_IMAGES_PER_LISTING} images (currently ${existingCount})`,
    );
  }

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

    // DERIVED, never written literally — one choke point, so the two upload
    // routes cannot disagree about what a new photo's state should be.
    const moderationState = nextImageState(
      { moderationStatus: listing.moderationStatus },
      auth.user.role === 'admin' ? 'admin' : 'host',
    );

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
          moderationState,
        };
      }),
    );
    const created = await prisma.image.createManyAndReturn({ data: uploads });

    after(() =>
      recordAdminLog({
        actor: auth.user,
        action: 'host.listing.images.upload',
        target: id,
        metadata: { count: created.length, moderationState },
      }),
    );
    // Only a LIVE photo changes what the public site shows.
    if (moderationState === 'LIVE') revalidateListingSurfaces(listing.slug);
    return apiOk({ data: created, moderationState }, { status: 201 });
  } catch (err) {
    logger.error(`POST /api/host/listings/${id}/images failed`, { err });
    if (err instanceof StorageConfigError) {
      return apiServiceUnavailable('Image storage is not configured');
    }
    // Generic: unlike the admin route, this is reachable by any signed-in host,
    // so it must not echo Prisma or storage internals back to the caller.
    return apiServerError('Upload failed');
  }
}
