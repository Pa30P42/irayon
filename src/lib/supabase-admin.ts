import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client backed by the SERVICE_ROLE key. Bypasses RLS,
 * so it must NEVER be imported from a client component or shipped to the
 * browser. Use only inside route handlers / server actions / scripts.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Raised when storage env vars are missing — a DEPLOYMENT problem, not a bad
 * request. Typed so route handlers can answer 503 with the missing variable's
 * name instead of a generic 500 that hides which var to set.
 */
export class StorageConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageConfigError';
  }
}

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  if (!url) throw new StorageConfigError('NEXT_PUBLIC_SUPABASE_URL is not set');
  if (!serviceRoleKey) throw new StorageConfigError('SUPABASE_SERVICE_ROLE_KEY is not set');
  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
