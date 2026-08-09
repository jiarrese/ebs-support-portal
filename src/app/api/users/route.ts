import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile, canManageUsers } from '@/lib/auth'
import type { UserRole } from '@/lib/types'

const ASSIGNABLE_ROLES: UserRole[] = ['admin', 'consultant', 'company_admin', 'client']

export async function POST(request: Request) {
  const supabase = await createClient()
  const caller = await getCurrentProfile(supabase)

  if (!caller || !canManageUsers(caller.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await request.json()
  const email = (body.email ?? '').trim().toLowerCase()
  const full_name = (body.full_name ?? '').trim()

  if (!email || !full_name) {
    return NextResponse.json({ error: 'Email y nombre son obligatorios' }, { status: 400 })
  }

  // company_admin solo puede invitar usuarios 'client' de su propia empresa,
  // sin importar lo que mande el body.
  let role: UserRole = body.role
  let company_id: string | null = body.company_id ?? null

  if (caller.role === 'company_admin') {
    role = 'client'
    company_id = caller.company_id ?? null
  } else {
    if (!ASSIGNABLE_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }
    if ((role === 'client' || role === 'company_admin') && !company_id) {
      return NextResponse.json({ error: 'Este rol requiere una empresa' }, { status: 400 })
    }
    if (role === 'admin' || role === 'consultant') company_id = null
  }

  const admin = createAdminClient()

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name },
    redirectTo: new URL('/', request.url).toString(),
  })
  if (inviteError || !invited.user) {
    return NextResponse.json({ error: inviteError?.message ?? 'No se pudo invitar al usuario' }, { status: 400 })
  }

  // El trigger on_auth_user_created ya insertó una fila en profiles (role: 'client')
  // apenas se creó el auth.user — upsert en vez de insert para no chocar con eso.
  const { error: profileError } = await admin.from('profiles').upsert({
    id: invited.user.id,
    full_name,
    role,
    company_id,
  })
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ id: invited.user.id })
}
