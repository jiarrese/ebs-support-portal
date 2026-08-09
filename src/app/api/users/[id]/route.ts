import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile, canManageUsers } from '@/lib/auth'
import type { UserRole } from '@/lib/types'

const ASSIGNABLE_ROLES: UserRole[] = ['admin', 'consultant', 'company_admin', 'client']

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const caller = await getCurrentProfile(supabase)

  if (!caller || !canManageUsers(caller.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: target } = await admin
    .from('profiles')
    .select('id, role, company_id')
    .eq('id', params.id)
    .single()

  if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  // company_admin solo puede editar usuarios 'client' de su propia empresa,
  // y no puede cambiarles el rol ni moverlos de empresa.
  if (caller.role === 'company_admin') {
    if (target.role !== 'client' || target.company_id !== caller.company_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
  }

  const body = await request.json()
  const update: Record<string, unknown> = {}

  if (typeof body.full_name === 'string' && body.full_name.trim()) {
    update.full_name = body.full_name.trim()
  }

  if (caller.role === 'admin') {
    if (body.role !== undefined) {
      if (!ASSIGNABLE_ROLES.includes(body.role)) {
        return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
      }
      update.role = body.role
    }
    if (body.company_id !== undefined) update.company_id = body.company_id || null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })
  }

  const { error } = await admin.from('profiles').update(update).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
