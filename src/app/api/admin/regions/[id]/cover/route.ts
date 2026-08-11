import { recordAdminLog } from '@/lib/admin-log';
import {
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
  MAX_IMAGE_BYTES,
  deleteListingImageByUrl,
  isAllowedMime,
  uploadListingImage,
} from '@/lib/storage';
import { StorageConfigError } from '@/lib/supabase-admin';
import { after } from 'next/server';

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/regions/:id/cover
 *
 * multipart/form-data with a single "file" field. Uploads through the same
 * storage pipeline as listing photos (magic-byte sniffing included) and sets
 * the region's coverImage to the resulting public URL. The previous cover is
 * removed from storage after the response if it lived in our bucket.
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

  const region = await prisma.region.findUnique({
    where: { id },
    select: { coverImage: true },
  });
  if (!region) return apiNotFound(`Region "${id}" not found`);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiBadRequestRaw('Could not parse multipart body');
  }

  const file = form.get('file');
  if (!(typeof file === 'object' && file !== null && 'arrayBuffer' in file && 'type' in file)) {
    return apiBadRequestRaw('No file provided (use field name "file")');
  }
  const upload = file as File;
  if (!isAllowedMime(upload.type)) {
    return new Response(
      JSON.stringify({
        error: {
          message: `Unsupported MIME type: ${upload.type}`,
          allowed: ALLOWED_IMAGE_MIME_TYPES,
        },
      }),
      { status: 415, headers: { 'content-type': 'application/json' } },
    );
  }
  if (upload.size > MAX_IMAGE_BYTES) {
    return new Response(
      JSON.stringify({ error: { message: `File exceeds ${MAX_IMAGE_BYTES} bytes` } }),
      { status: 413, headers: { 'content-type': 'application/json' } },
    );
  }

  try {
    const uploaded = await uploadListingImage({
      // Region covers share the listings bucket under their own key prefix.
      listingId: `region-cover/${id}`,
      file: { type: upload.type, size: upload.size, arrayBuffer: () => upload.arrayBuffer() },
    });

    await prisma.region.update({ where: { id }, data: { coverImage: uploaded.publicUrl } });

    const previous = region.coverImage;
    after(async () => {
      // Old cover cleanup (no-op for external URLs); log after outcome known.
      let previousDeleted = false;
      if (previous) {
        try {
          previousDeleted = (await deleteListingImageByUrl(previous)).deleted;
        } catch (err) {
          logger.error(`old region cover cleanup failed for ${id}`, { err, url: previous });
        }
      }
      await recordAdminLog({
        actor: auth.user,
        action: 'region.cover.upload',
        target: id,
        metadata: { url: uploaded.publicUrl, previousDeleted },
      });
    });
    revalidateListingSurfaces();
    return apiOk({ coverImage: uploaded.publicUrl });
  } catch (err) {
    logger.error(`POST /api/admin/regions/${id}/cover failed`, { err });
    if (err instanceof StorageConfigError) {
      return apiServiceUnavailable(`Image storage is not configured: ${err.message}`);
    }
    return apiServerError(
      `Cover upload failed: ${err instanceof Error ? err.message : 'unknown error'}`,
    );
  }
}
