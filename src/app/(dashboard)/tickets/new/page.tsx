'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { EBS_MODULES } from '@/lib/utils'
import type { Company, EbsEnvironment } from '@/lib/types'

export default function NewTicketPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [environments, setEnvironments] = useState<EbsEnvironment[]>([])
  const [selectedCompany, setSelectedCompany] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium',
    ebs_module: '', environment_id: '',
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.from('companies').select('*').eq('active', true).then(({ data }) => {
      setCompanies(data ?? [])
    })
  }, [])

  useEffect(() => {
    if (!selectedCompany) { setEnvironments([]); return }
    const supabase = createClient()
    supabase.from('ebs_environments')
      .select('*').eq('company_id', selectedCompany).eq('active', true)
      .then(({ data }) => setEnvironments(data ?? []))
  }, [selectedCompany])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase.from('tickets').insert({
      ...form,
      company_id: selectedCompany,
      environment_id: form.environment_id || null,
      ebs_module: form.ebs_module || null,
      reported_by: user!.id,
      status: 'open',
    }).select().single()

    if (error) { alert('Error al crear ticket: ' + error.message); setLoading(false); return }
    router.push(`/tickets/${data.id}`)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Nuevo ticket</h1>
        <p className="text-sm text-gray-500 mt-0.5">Completá los datos del problema o consulta</p>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Título *</label>
            <input
              className="input"
              placeholder="Ej: Error en cierre de período GL"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input min-h-[100px] resize-y"
              placeholder="Describí el problema, pasos para reproducirlo, mensajes de error..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Empresa *</label>
              <select
                className="input"
                value={selectedCompany}
                onChange={e => { setSelectedCompany(e.target.value); setForm(f => ({ ...f, environment_id: '' })) }}
                required
              >
                <option value="">Seleccioná empresa</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Ambiente</label>
              <select
                className="input"
                value={form.environment_id}
                onChange={e => setForm(f => ({ ...f, environment_id: e.target.value }))}
                disabled={!selectedCompany}
              >
                <option value="">Seleccioná ambiente</option>
                {environments.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Módulo EBS</label>
              <select
                className="input"
                value={form.ebs_module}
                onChange={e => setForm(f => ({ ...f, ebs_module: e.target.value }))}
              >
                <option value="">Seleccioná módulo</option>
                {EBS_MODULES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Prioridad *</label>
              <select
                className="input"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creando...' : 'Crear ticket'}
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
