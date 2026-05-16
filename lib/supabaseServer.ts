import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type SupabaseError = {
  code?: string;
  message?: string;
};

export const getSupabaseEnvStatus = () => ({
  hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
});

export const logSupabaseError = (operation: string, error: SupabaseError) => {
  const isPermissionError =
    error.code === '42501' || error.message?.toLowerCase().includes('permission denied');

  if (isPermissionError) {
    console.warn(`Supabase permission error during ${operation}.`, {
      ...getSupabaseEnvStatus(),
      code: error.code ?? 'unknown'
    });
    return;
  }

  console.warn(`Supabase error during ${operation}:`, {
    code: error.code ?? 'unknown',
    message: error.message ?? 'unknown'
  });
};

export const getSupabaseServerClient = (): SupabaseClient | null => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('Supabase server access skipped: missing Supabase environment variables.', {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey)
    });
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
};
