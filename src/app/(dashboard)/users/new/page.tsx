'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types'

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'consultant', label: 'Consultor' },
  { value: 'company_admin', label: 'Admin de empresa' },
  { value: 'client', label: 'Cliente' },
]

export default function NewUserPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [callerRole, setCallerRole] = useState<UserRole | null>(null)
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    role: 'client' as UserRole,
    company_id: '',
  })

  const isCompanyAdmin = callerRole === 'company_admin'
  const needsCompany = form.role === 'client' || form.role === 'company_admin'

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles').select('role, company_id').eq('id', user.id).single()
      setCallerRole(profile?.role ?? null)
      if (profile?.role === 'company_admin') {
        setForm(f => ({ ...f, role: 'client', company_id: profile.company_id ?? '' }))
      }
    })
    supabase.from('companies').select('id, name').eq('active', true).order('name')
      .then(({ data }) => setCompanies(data ?? []))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        full_name: form.full_name,
        role: form.role,
        company_id: needsCompany ? form.company_id : null,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'No se pudo invitar al usuario')
      setLoading(false)
      return
    }

    router.push('/users')
    router.refresh()
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Invitar usuario</h1>
        <p className="text-sm text-gray-500 mt-0.5">Se le enviará un mail para que configure su contraseña</p>
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

          <div>
            <label className="label">Email *</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </div>

          {!isCompanyAdmin && (
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

          {!isCompanyAdmin && needsCompany && (
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
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Invitando...' : 'Invitar usuario'}
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
