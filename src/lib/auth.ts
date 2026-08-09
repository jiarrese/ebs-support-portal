import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '@/lib/types'

export interface CurrentProfile {
  id: string
  full_name: string
  role: UserRole
  company_id?: string
}

export async function getCurrentProfile(supabase: SupabaseClient): Promise<CurrentProfile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, company_id')
    .eq('id', user.id)
    .single()

  return profile as CurrentProfile | null
}

export const isOpsRole = (role?: UserRole) => role === 'admin' || role === 'consultant'
export const canManageUsers = (role?: UserRole) => role === 'admin' || role === 'company_admin'
