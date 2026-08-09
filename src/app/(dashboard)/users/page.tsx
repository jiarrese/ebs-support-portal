import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile, canManageUsers } from '@/lib/auth'
import type { UserRole } from '@/lib/types'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  consultant: 'Consultor',
  company_admin: 'Admin de empresa',
  client: 'Cliente',
}
const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-indigo-100 text-indigo-700',
  consultant: 'bg-blue-100 text-blue-700',
  company_admin: 'bg-purple-100 text-purple-700',
  client: 'bg-gray-100 text-gray-600',
}

export default async function UsersPage() {
  const supabase = await createClient()
  const profile = await getCurrentProfile(supabase)

  if (!profile || !canManageUsers(profile.role)) redirect('/tickets')

  let query = supabase
    .from('profiles')
    .select('id, full_name, role, company_id, companies(name)')
    .order('full_name')

  if (profile.role === 'company_admin') {
    query = query.eq('company_id', profile.company_id)
  }

  const { data: users } = await query

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users?.length ?? 0} usuarios</p>
        </div>
        <Link href="/users/new" className="btn-primary">+ Invitar usuario</Link>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 font-medium">Rol</th>
                <th className="text-left px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(users ?? []).map((u: any) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.full_name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role as UserRole]}`}>
                      {ROLE_LABELS[u.role as UserRole]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.companies?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/users/${u.id}`} className="btn-secondary py-1.5 text-xs">Editar</Link>
                  </td>
                </tr>
              ))}
              {(!users || users.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-400">Sin usuarios</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
