import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

export type Paginated<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
};

export type ApiError = {
  error: {
    message: string;
    /** Field-level errors when the failure is a validation problem. */
    fields?: Record<string, string[]>;
  };
};

/**
 * Cache-Control values for public GET handlers. `export const revalidate` is
 * inert on these routes (they read the request URL, which forces dynamic
 * rendering) — explicit CDN headers are what actually caches them. Admin
 * routes are stamped `private, no-store` centrally in `src/middleware.ts`.
 */
export const CACHE_PUBLIC_LIST = 'public, s-maxage=60, stale-while-revalidate=300';
export const CACHE_PUBLIC_DETAIL = 'public, s-maxage=300, stale-while-revalidate=600';

export const apiOk = <T>(data: T, init?: ResponseInit) => NextResponse.json(data, init);

/** apiOk + a public CDN cache header. Use only on unauthenticated GETs. */
export const apiOkCached = <T>(data: T, cacheControl: string) =>
  NextResponse.json(data, { headers: { 'Cache-Control': cacheControl } });

export const apiPaginated = <T>(payload: Paginated<T>, cacheControl?: string) =>
  NextResponse.json(
    payload,
    cacheControl ? { headers: { 'Cache-Control': cacheControl } } : undefined,
  );

export const apiNotFound = (message = 'Not found') =>
  NextResponse.json<ApiError>({ error: { message } }, { status: 404 });

export const apiBadRequest = (error: ZodError) =>
  NextResponse.json<ApiError>(
    {
      error: {
        message: 'Invalid query parameters',
        fields: error.flatten().fieldErrors as Record<string, string[]>,
      },
    },
    { status: 400 },
  );

/**
 * 400 with a plain message — for non-field validation failures (e.g. malformed
 * JSON body). Distinct from `apiBadRequest` which carries Zod field errors.
 */
export const apiBadRequestRaw = (message: string) =>
  NextResponse.json<ApiError>({ error: { message } }, { status: 400 });

/**
 * 409 with optional structured field info — used when a delete is blocked by
 * referential integrity (e.g. region has listings, village has listings).
 */
export const apiConflict = (message: string, fields?: Record<string, string[]>) =>
  NextResponse.json<ApiError>(
    { error: fields ? { message, fields } : { message } },
    { status: 409 },
  );

export const apiUnauthorized = (message = 'Authentication required') =>
  NextResponse.json<ApiError>({ error: { message } }, { status: 401 });

export const apiServerError = (message = 'Internal server error') =>
  NextResponse.json<ApiError>({ error: { message } }, { status: 500 });
