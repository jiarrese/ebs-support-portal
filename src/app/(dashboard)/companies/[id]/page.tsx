'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { EbsEnvironment, EbsEnv } from '@/lib/types'

const CURRENCIES = ['USD', 'ARS', 'EUR']
const ENV_TYPES: { value: EbsEnv; label: string }[] = [
  { value: 'production',  label: 'Producción' },
  { value: 'development', label: 'Desarrollo' },
  { value: 'qa',          label: 'QA' },
  { value: 'uat',         label: 'UAT' },
  { value: 'staging',     label: 'Staging' },
]

const EMPTY_ENV = { name: '', env_type: 'production' as EbsEnv, ebs_version: '', notes: '' }

export default function EditCompanyPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', slug: '', tax_id: '', hourly_rate: '', currency: 'USD', notes: '', active: true,
  })

  const [environments, setEnvironments] = useState<EbsEnvironment[]>([])
  const [showEnvForm, setShowEnvForm] = useState(false)
  const [envForm, setEnvForm] = useState(EMPTY_ENV)
  const [savingEnv, setSavingEnv] = useState(false)
  const [envError, setEnvError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    setLoading(true)
    Promise.all([
      supabase.from('companies').select('*').eq('id', id).single(),
      supabase.from('ebs_environments').select('*').eq('company_id', id).order('name'),
    ]).then(([{ data: company }, { data: envs }]) => {
      if (company) {
        setForm({
          name: company.name,
          slug: company.slug,
          tax_id: company.tax_id ?? '',
          hourly_rate: String(company.hourly_rate),
          currency: company.currency,
          notes: company.notes ?? '',
          active: company.active,
        })
      }
      setEnvironments(envs ?? [])
      setLoading(false)
    })
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.from('companies').update({
      name: form.name,
      slug: form.slug,
      tax_id: form.tax_id || null,
      hourly_rate: parseFloat(form.hourly_rate),
      currency: form.currency,
      notes: form.notes || null,
      active: form.active,
    }).eq('id', id)
    if (error) { setError(error.message); setSaving(false); return }
    router.push('/companies')
    router.refresh()
  }

  async function handleAddEnv(e: React.FormEvent) {
    e.preventDefault()
    setSavingEnv(true)
    setEnvError('')
    const supabase = createClient()
    const { data, error } = await supabase.from('ebs_environments').insert({
      company_id: id,
      name: envForm.name,
      env_type: envForm.env_type,
      ebs_version: envForm.ebs_version || null,
      notes: envForm.notes || null,
      active: true,
    }).select().single()
    if (error) { setEnvError(error.message); setSavingEnv(false); return }
    setEnvironments(prev => [...prev, data])
    setEnvForm(EMPTY_ENV)
    setShowEnvForm(false)
    setSavingEnv(false)
  }

  async function toggleEnvActive(env: EbsEnvironment) {
    const supabase = createClient()
    const { data } = await supabase
      .from('ebs_environments')
      .update({ active: !env.active })
      .eq('id', env.id)
      .select()
      .single()
    if (data) setEnvironments(prev => prev.map(e => e.id === env.id ? data : e))
  }

  if (loading) return <div className="text-sm text-gray-400 p-4">Cargando...</div>

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Editar empresa</h1>
        <p className="text-sm text-gray-500 mt-0.5">{form.name}</p>
      </div>

      {/* Datos empresa */}
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Nombre *</label>
            <input className="input" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Slug *</label>
            <input className="input font-mono text-sm" value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} required />
          </div>
          <div>
            <label className="label">CUIT / Tax ID</label>
            <input className="input" value={form.tax_id}
              onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tarifa por hora *</label>
              <input className="input" type="number" min="0" step="0.01" value={form.hourly_rate}
                onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Moneda *</label>
              <select className="input" value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea className="input min-h-[80px] resize-y" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.active}
                onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                className="rounded border-gray-300 text-indigo-600" />
              Empresa activa
            </label>
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
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

      {/* Ambientes EBS */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Ambientes EBS</h2>
          {!showEnvForm && (
            <button onClick={() => setShowEnvForm(true)} className="btn-secondary py-1 text-xs">
              + Nuevo ambiente
            </button>
          )}
        </div>

        {/* Lista de ambientes */}
        <div className="space-y-2 mb-4">
          {environments.length === 0 && !showEnvForm && (
            <p className="text-sm text-gray-400">Sin ambientes. Agregá uno para poder seleccionarlo en tickets.</p>
          )}
          {environments.map(env => (
            <div key={env.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
              <div>
                <span className="text-sm font-medium text-gray-800">{env.name}</span>
                <span className="ml-2 text-xs text-gray-400">
                  {ENV_TYPES.find(t => t.value === env.env_type)?.label}
                  {env.ebs_version && ` · v${env.ebs_version}`}
                </span>
              </div>
              <button
                onClick={() => toggleEnvActive(env)}
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  env.active
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                }`}
              >
                {env.active ? 'Activo' : 'Inactivo'}
              </button>
            </div>
          ))}
        </div>

        {/* Formulario nuevo ambiente */}
        {showEnvForm && (
          <form onSubmit={handleAddEnv} className="space-y-3 pt-3 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Nombre *</label>
                <input className="input text-sm" placeholder="Ej: Producción ACME"
                  value={envForm.name}
                  onChange={e => setEnvForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Tipo *</label>
                <select className="input text-sm" value={envForm.env_type}
                  onChange={e => setEnvForm(f => ({ ...f, env_type: e.target.value as EbsEnv }))}>
                  {ENV_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Versión EBS</label>
              <input className="input text-sm" placeholder="Ej: 12.2.9"
                value={envForm.ebs_version}
                onChange={e => setEnvForm(f => ({ ...f, ebs_version: e.target.value }))} />
            </div>
            <div>
              <label className="label">Notas</label>
              <input className="input text-sm" placeholder="Descripción opcional"
                value={envForm.notes}
                onChange={e => setEnvForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            {envError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{envError}</div>
            )}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary py-1.5 text-sm" disabled={savingEnv}>
                {savingEnv ? 'Guardando...' : 'Agregar ambiente'}
              </button>
              <button type="button" className="btn-secondary py-1.5 text-sm"
                onClick={() => { setShowEnvForm(false); setEnvForm(EMPTY_ENV); setEnvError('') }}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
