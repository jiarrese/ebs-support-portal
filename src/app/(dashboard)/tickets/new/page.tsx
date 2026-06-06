'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { EBS_MODULES } from '@/lib/utils'
import type { Company } from '@/lib/types'

export default function NewTicketPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', ebs_module: '',
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.from('companies').select('*').eq('active', true).order('name').then(({ data }) => {
      setCompanies(data ?? [])
    })
  }, [])

  function toggleCompany(id: string) {
    setSelectedCompanies(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedCompanies.length === 0) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const tickets = selectedCompanies.map(company_id => ({
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      ebs_module: form.ebs_module || null,
      company_id,
      reported_by: user!.id,
      status: 'open',
    }))

    const { data, error } = await supabase
      .from('tickets')
      .insert(tickets)
      .select()

    if (error) { alert('Error al crear ticket: ' + error.message); setLoading(false); return }

    // Si es una sola empresa va al ticket, si son varias va a la lista
    if (data.length === 1) {
      router.push(`/tickets/${data[0].id}`)
    } else {
      router.push('/tickets')
    }
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

          {/* Selección múltiple de empresas */}
          <div>
            <label className="label">
              Empresa *
              {selectedCompanies.length > 1 && (
                <span className="ml-2 text-xs font-normal text-indigo-600">
                  Se crearán {selectedCompanies.length} tickets (uno por empresa)
                </span>
              )}
            </label>
            <div className="border border-gray-300 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
              {companies.map(company => {
                const selected = selectedCompanies.includes(company.id)
                return (
                  <label
                    key={company.id}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                      selected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleCompany(company.id)}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                    <span className={`text-sm ${selected ? 'font-medium text-indigo-700' : 'text-gray-700'}`}>
                      {company.name}
                    </span>
                  </label>
                )
              })}
              {companies.length === 0 && (
                <p className="px-3 py-4 text-sm text-gray-400">No hay empresas activas</p>
              )}
            </div>
            {selectedCompanies.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">Seleccioná al menos una empresa</p>
            )}
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
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || selectedCompanies.length === 0}
            >
              {loading
                ? 'Creando...'
                : selectedCompanies.length > 1
                  ? `Crear ${selectedCompanies.length} tickets`
                  : 'Crear ticket'
              }
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
