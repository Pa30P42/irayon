import { createListingSchema } from './listings-create-validator';

/**
 * Host-submitted listing payload.
 *
 * `.strict()` on purpose: a plain `z.object` silently STRIPS unknown keys,
 * which is safe today but says nothing about intent. Strict mode turns an
 * attempt to send `moderationStatus`, `hostId`, `rating`, or `reviewCount`
 * into a visible 400 instead of a quietly ignored field — the difference
 * between "we drop it" and "we notice someone tried".
 *
 * The fields a host must never control are absent from the schema entirely, so
 * there is no code path that could assign them from a request body.
 */
export const hostListingSchema = createListingSchema.strict();

export type HostListingInput = typeof hostListingSchema._output;
