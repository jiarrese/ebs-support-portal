import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Cliente con service-role key — solo para uso server-side (route handlers).
// Bypasea RLS, así que cada caller es responsable de autorizar antes de usarlo.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
