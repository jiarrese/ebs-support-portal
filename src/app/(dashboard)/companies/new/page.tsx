'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CURRENCIES = ['USD', 'ARS', 'EUR']

function toSlug(name: string) {
  return name.toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export default function NewCompanyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    slug: '',
    tax_id: '',
    hourly_rate: '',
    currency: 'USD',
    notes: '',
  })

  function handleNameChange(name: string) {
    setForm(f => ({
      ...f,
      name,
      slug: f.slug === toSlug(f.name) || f.slug === '' ? toSlug(name) : f.slug,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.from('companies').insert({
      name: form.name,
      slug: form.slug,
      tax_id: form.tax_id || null,
      hourly_rate: parseFloat(form.hourly_rate),
      currency: form.currency,
      notes: form.notes || null,
      active: true,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/companies')
    router.refresh()
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Nueva empresa</h1>
        <p className="text-sm text-gray-500 mt-0.5">Completá los datos del cliente</p>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Nombre *</label>
            <input
              className="input"
              placeholder="Ej: Acme S.A."
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Slug *</label>
            <input
              className="input font-mono text-sm"
              placeholder="acme-sa"
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              required
            />
            <p className="text-xs text-gray-400 mt-1">Identificador único, sin espacios ni caracteres especiales</p>
          </div>

          <div>
            <label className="label">CUIT / Tax ID</label>
            <input
              className="input"
              placeholder="20-12345678-9"
              value={form.tax_id}
              onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tarifa por hora *</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="150"
                value={form.hourly_rate}
                onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Moneda *</label>
              <select
                className="input"
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Notas</label>
            <textarea
              className="input min-h-[80px] resize-y"
              placeholder="Información adicional..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Crear empresa'}
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
