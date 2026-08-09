'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types'

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'consultant', label: 'Consultor' },
  { value: 'company_admin', label: 'Admin de empresa' },
  { value: 'client', label: 'Cliente' },
]

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [callerRole, setCallerRole] = useState<UserRole | null>(null)
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({ full_name: '', role: 'client' as UserRole, company_id: '' })

  const isAdmin = callerRole === 'admin'
  const needsCompany = form.role === 'client' || form.role === 'company_admin'

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.auth.getUser().then(({ data: { user } }) =>
        user ? supabase.from('profiles').select('role').eq('id', user.id).single() : null
      ),
      supabase.from('profiles').select('full_name, role, company_id').eq('id', id).single(),
      supabase.from('companies').select('id, name').eq('active', true).order('name'),
    ]).then(([caller, target, companiesRes]) => {
      setCallerRole(caller?.data?.role ?? null)
      if (target.data) {
        setForm({
          full_name: target.data.full_name,
          role: target.data.role,
          company_id: target.data.company_id ?? '',
        })
      }
      setCompanies(companiesRes.data ?? [])
      setLoading(false)
    })
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const body: Record<string, unknown> = { full_name: form.full_name }
    if (isAdmin) {
      body.role = form.role
      body.company_id = needsCompany ? form.company_id : null
    }

    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const resBody = await res.json().catch(() => ({}))
      setError(resBody.error ?? 'No se pudo guardar')
      setSaving(false)
      return
    }

    router.push('/users')
    router.refresh()
  }

  if (loading) return <div className="text-sm text-gray-400 p-4">Cargando...</div>

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Editar usuario</h1>
        <p className="text-sm text-gray-500 mt-0.5">{form.full_name}</p>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Nombre *</label>
            <input
              className="input"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              required
            />
          </div>

          {isAdmin && (
            <div>
              <label className="label">Rol *</label>
              <select
                className="input"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
              >
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          )}

          {isAdmin && needsCompany && (
            <div>
              <label className="label">Empresa *</label>
              <select
                className="input"
                value={form.company_id}
                onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))}
                required
              >
                <option value="">Seleccionar...</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => router.back()}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
