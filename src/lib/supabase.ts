import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(
    url &&
      anonKey &&
      isValidHttpUrl(url) &&
      !url.includes('your-project-id') &&
      !anonKey.includes('your-anon-key')
  );
}

export function getPublicSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    {
      auth: { persistSession: false },
    }
  );
}

export function getAdminSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const serviceKey =
    rawServiceKey && !rawServiceKey.includes('your-service-role-key')
      ? rawServiceKey
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), serviceKey, {
    auth: { persistSession: false },
  });
}
