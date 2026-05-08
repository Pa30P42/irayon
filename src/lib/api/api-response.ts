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

export const apiOk = <T>(data: T, init?: ResponseInit) => NextResponse.json(data, init);

export const apiPaginated = <T>(payload: Paginated<T>) => NextResponse.json(payload);

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
 * 409 with optional structured field info — used when a delete is blocked by
 * referential integrity (e.g. region has listings, village has listings).
 */
export const apiConflict = (message: string, fields?: Record<string, string[]>) =>
  NextResponse.json<ApiError>({ error: { message, fields } }, { status: 409 });

export const apiUnauthorized = (message = 'Authentication required') =>
  NextResponse.json<ApiError>({ error: { message } }, { status: 401 });

export const apiServerError = (message = 'Internal server error') =>
  NextResponse.json<ApiError>({ error: { message } }, { status: 500 });
