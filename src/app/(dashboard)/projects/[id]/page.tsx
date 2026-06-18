'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatHours, formatCurrency } from '@/lib/utils'
import type { Company, BillingType, ProjectMonthlySummary } from '@/lib/types'

const CURRENCIES = ['USD', 'ARS', 'EUR']
const BILLING_OPTIONS: { value: BillingType; label: string }[] = [
  { value: 'hourly',        label: 'Por hora' },
  { value: 'monthly_hours', label: 'Horas mensuales' },
  { value: 'fixed',         label: 'Precio fijo' },
]

export default function EditProjectPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [monthly, setMonthly] = useState<ProjectMonthlySummary[]>([])
  const [form, setForm] = useState({
    name: '', description: '', billing_type: 'hourly' as BillingType,
    monthly_hours: '', hourly_rate: '', currency: 'USD', active: true,
  })

  useEffect(() => {
    const supabase = createClient()
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    const from = sixMonthsAgo.toISOString().slice(0, 7) + '-01'

    Promise.all([
      supabase.from('projects').select('*, project_companies(company_id)').eq('id', id).single(),
      supabase.from('companies').select('*').eq('active', true).order('name'),
      supabase.from('project_monthly_summary').select('*').eq('project_id', id).gte('month', from).order('month'),
    ]).then(([{ data: proj }, { data: comps }, { data: mon }]) => {
      if (proj) {
        setForm({
          name: proj.name,
          description: proj.description ?? '',
          billing_type: proj.billing_type,
          monthly_hours: proj.monthly_hours ? String(proj.monthly_hours) : '',
          hourly_rate: proj.hourly_rate ? String(proj.hourly_rate) : '',
          currency: proj.currency,
          active: proj.active,
        })
        setSelectedCompanies((proj.project_companies ?? []).map((pc: any) => pc.company_id))
      }
      setCompanies(comps ?? [])
      setMonthly(mon ?? [])
      setLoading(false)
    })
  }, [id])

  function toggleCompany(cid: string) {
    setSelectedCompanies(prev => prev.includes(cid) ? prev.filter(c => c !== cid) : [...prev, cid])
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar el proyecto "${form.name}"? Esta acción no se puede deshacer.`)) return
    const supabase = createClient()
    await supabase.from('project_companies').delete().eq('project_id', id)
    const { error: err } = await supabase.from('projects').delete().eq('id', id)
    if (err) { setError(err.message); return }
    router.push('/projects')
    router.refresh()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const supabase = createClient()

    const { error: err } = await supabase.from('projects').update({
      name: form.name,
      description: form.description || null,
      billing_type: form.billing_type,
      monthly_hours: form.monthly_hours ? parseFloat(form.monthly_hours) : null,
      hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
      currency: form.currency,
      active: form.active,
    }).eq('id', id)

    if (err) { setError(err.message); setSaving(false); return }

    // Sync project_companies
    await supabase.from('project_companies').delete().eq('project_id', id)
    if (selectedCompanies.length > 0) {
      await supabase.from('project_companies').insert(
        selectedCompanies.map(company_id => ({ project_id: id, company_id }))
      )
    }

    router.push('/projects')
  }

  if (loading) return <div className="text-sm text-gray-400 p-4">Cargando...</div>

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Editar proyecto</h1>
        <p className="text-sm text-gray-500 mt-0.5">{form.name}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card p-6 space-y-5">
          <div>
            <label className="label">Nombre *</label>
            <input className="input" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea className="input min-h-[72px] resize-none" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div>
            <label className="label">Tipo de facturación *</label>
            <select className="input" value={form.billing_type}
              onChange={e => setForm(f => ({ ...f, billing_type: e.target.value as BillingType }))}>
              {BILLING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {form.billing_type === 'monthly_hours' && (
            <div>
              <label className="label">Horas incluidas por mes *</label>
              <input className="input" type="number" min="1" step="0.5"
                value={form.monthly_hours}
                onChange={e => setForm(f => ({ ...f, monthly_hours: e.target.value }))} required />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Tarifa/hora</label>
              <input className="input" type="number" min="0" step="0.01"
                value={form.hourly_rate}
                onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} />
            </div>
            <div>
              <label className="label">Moneda</label>
              <select className="input" value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              className="rounded border-gray-300 text-indigo-600" />
            Proyecto activo
          </label>
        </div>

        {/* Empresas */}
        <div className="card p-6">
          <label className="label mb-3">Empresas asociadas</label>
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
            {companies.map(company => {
              const selected = selectedCompanies.includes(company.id)
              return (
                <label key={company.id}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${selected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                >
                  <input type="checkbox" checked={selected} onChange={() => toggleCompany(company.id)}
                    className="rounded border-gray-300 text-indigo-600" />
                  <span className={`text-sm ${selected ? 'font-medium text-indigo-700' : 'text-gray-700'}`}>
                    {company.name}
                  </span>
                </label>
              )
            })}
          </div>
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancelar</button>
          </div>
          <button type="button" className="btn-danger py-2 text-sm" onClick={handleDelete}>
            Eliminar proyecto
          </button>
        </div>
      </form>

      {/* Consumo mensual (solo monthly_hours) */}
      {form.billing_type === 'monthly_hours' && form.monthly_hours && monthly.length > 0 && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Consumo mensual de horas</h2>
          <div className="space-y-3">
            {monthly.map(row => {
              const budget = parseFloat(form.monthly_hours)
              const pct = Math.min((row.used_hours / budget) * 100, 100)
              const over = row.used_hours > budget
              return (
                <div key={row.month}>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>{new Date(row.month + 'T12:00:00').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</span>
                    <span className={over ? 'text-red-600 font-semibold' : ''}>
                      {formatHours(row.used_hours)} / {formatHours(budget)}
                      {over && ' ⚠ Excedido'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${over ? 'bg-red-500' : pct > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
