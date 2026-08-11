/**
 * The listing form is used from two cabinets that hit different APIs:
 *
 *   - `admin` → `/api/admin/listings/*` — writes apply live, no moderation;
 *   - `host`  → `/api/host/listings/*`  — significant edits queue for review.
 *
 * The difference is expressed ONLY as a set of URLs, threaded through the form
 * and its hooks as data. Nothing downstream branches on the mode, so the two
 * paths cannot drift into two subtly different forms — which is the entire
 * point of the refactor. The authorization difference lives on the server,
 * where it belongs; these strings are a convenience, never a permission.
 */

export type ListingFormMode = 'admin' | 'host';

export type ListingEndpoints = {
  /** POST — create a listing. */
  create: string;
  /** PATCH — update scalars. */
  update: (listingId: string) => string;
  /** POST multipart — append images. */
  images: (listingId: string) => string;
  /** DELETE — remove one image. */
  image: (listingId: string, imageId: string) => string;
  /** PATCH — persist the full display order. */
  reorder: (listingId: string) => string;
};

const enc = encodeURIComponent;

const forBase = (base: string): ListingEndpoints => ({
  create: base,
  update: (listingId) => `${base}/${enc(listingId)}`,
  images: (listingId) => `${base}/${enc(listingId)}/images`,
  image: (listingId, imageId) => `${base}/${enc(listingId)}/images/${enc(imageId)}`,
  reorder: (listingId) => `${base}/${enc(listingId)}/images/reorder`,
});

const ADMIN_ENDPOINTS = forBase('/api/admin/listings');
const HOST_ENDPOINTS = forBase('/api/host/listings');

export const listingEndpointsFor = (mode: ListingFormMode): ListingEndpoints =>
  mode === 'admin' ? ADMIN_ENDPOINTS : HOST_ENDPOINTS;
