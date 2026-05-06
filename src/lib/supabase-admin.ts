import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client backed by the SERVICE_ROLE key. Bypasses RLS,
 * so it must NEVER be imported from a client component or shipped to the
 * browser. Use only inside route handlers / server actions / scripts.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
