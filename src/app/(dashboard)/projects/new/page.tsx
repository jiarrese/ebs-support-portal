'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Company, BillingType } from '@/lib/types'

const CURRENCIES = ['USD', 'ARS', 'EUR']
const BILLING_OPTIONS: { value: BillingType; label: string; desc: string }[] = [
  { value: 'hourly',        label: 'Por hora',          desc: 'Se factura según las horas registradas' },
  { value: 'monthly_hours', label: 'Horas mensuales',   desc: 'Bolsa de horas fija por mes' },
  { value: 'fixed',         label: 'Precio fijo',       desc: 'Monto fijo independiente de las horas' },
]

export default function NewProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [form, setForm] = useState({
    name: '', description: '', billing_type: 'hourly' as BillingType,
    monthly_hours: '', hourly_rate: '', currency: 'USD',
  })

  useEffect(() => {
    createClient().from('companies').select('*').eq('active', true).order('name')
      .then(({ data }) => setCompanies(data ?? []))
  }, [])

  function toggleCompany(id: string) {
    setSelectedCompanies(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()

    const { data: project, error: err } = await supabase.from('projects').insert({
      name: form.name,
      description: form.description || null,
      billing_type: form.billing_type,
      monthly_hours: form.monthly_hours ? parseFloat(form.monthly_hours) : null,
      hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
      currency: form.currency,
    }).select().single()

    if (err) { setError(err.message); setLoading(false); return }

    if (selectedCompanies.length > 0) {
      await supabase.from('project_companies').insert(
        selectedCompanies.map(company_id => ({ project_id: project.id, company_id }))
      )
    }

    router.push('/projects')
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Nuevo proyecto</h1>
        <p className="text-sm text-gray-500 mt-0.5">Definí el tipo de contrato y las empresas asociadas</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card p-6 space-y-5">
          <div>
            <label className="label">Nombre *</label>
            <input className="input" placeholder="Ej: Soporte EBS - Vicentin"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea className="input min-h-[72px] resize-none"
              placeholder="Alcance, modalidad, observaciones..."
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          {/* Tipo de facturación */}
          <div>
            <label className="label">Tipo de facturación *</label>
            <div className="space-y-2">
              {BILLING_OPTIONS.map(opt => (
                <label key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    form.billing_type === opt.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input type="radio" name="billing_type" value={opt.value}
                    checked={form.billing_type === opt.value}
                    onChange={() => setForm(f => ({ ...f, billing_type: opt.value }))}
                    className="mt-0.5 text-indigo-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Horas mensuales (solo para monthly_hours) */}
          {form.billing_type === 'monthly_hours' && (
            <div>
              <label className="label">Horas incluidas por mes *</label>
              <input className="input" type="number" min="1" step="0.5" placeholder="40"
                value={form.monthly_hours}
                onChange={e => setForm(f => ({ ...f, monthly_hours: e.target.value }))} required />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Tarifa/hora {form.billing_type === 'hourly' ? '*' : '(opcional)'}</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="150"
                value={form.hourly_rate}
                onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))}
                required={form.billing_type === 'hourly'} />
            </div>
            <div>
              <label className="label">Moneda</label>
              <select className="input" value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Empresas */}
        <div className="card p-6">
          <label className="label mb-3">Empresas asociadas</label>
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
            {companies.map(company => {
              const selected = selectedCompanies.includes(company.id)
              return (
                <label key={company.id}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                    selected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                  }`}
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

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creando...' : 'Crear proyecto'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancelar</button>
        </div>
      </form>
    </div>
  )
}
