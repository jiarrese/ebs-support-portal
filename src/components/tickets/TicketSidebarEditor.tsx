'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDate, EBS_MODULES } from '@/lib/utils'
import type { EbsEnvironment, Project } from '@/lib/types'

interface Props {
  ticketId: string
  companyId: string
  companyName: string
  environmentId: string | null
  environmentName?: string
  ebsModule?: string
  projectId?: string | null
  assignedToName?: string
  createdAt: string
  isConsultant: boolean
}

export default function TicketSidebarEditor({
  ticketId, companyId, companyName,
  environmentId: initialEnvId,
  environmentName,
  ebsModule: initialModule,
  projectId: initialProjectId,
  assignedToName,
  createdAt,
  isConsultant,
}: Props) {
  const router = useRouter()
  const [environments, setEnvironments] = useState<EbsEnvironment[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [envId, setEnvId] = useState(initialEnvId ?? '')
  const [module, setModule] = useState(initialModule ?? '')
  const [projectId, setProjectId] = useState(initialProjectId ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('ebs_environments')
      .select('*').eq('company_id', companyId).eq('active', true).order('name')
      .then(({ data }) => setEnvironments(data ?? []))
    supabase.from('projects').select('*').eq('active', true).order('name')
      .then(({ data }) => setProjects(data ?? []))
  }, [companyId])

  async function save(updates: { environment_id?: string | null; ebs_module?: string | null; project_id?: string | null }) {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('tickets').update(updates).eq('id', ticketId)
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="card p-4 space-y-4 text-sm">
      {/* Empresa (no editable, el ticket ya está asignado) */}
      <div>
        <p className="text-xs text-gray-400 mb-0.5">Empresa</p>
        <p className="font-medium text-gray-800">{companyName}</p>
      </div>

      {/* Ambiente — editable para consultores */}
      <div>
        <p className="text-xs text-gray-400 mb-1">Ambiente</p>
        {isConsultant ? (
          <select
            className="input text-sm py-1.5"
            value={envId}
            disabled={saving}
            onChange={e => {
              setEnvId(e.target.value)
              save({ environment_id: e.target.value || null })
            }}
          >
            <option value="">Sin ambiente</option>
            {environments.map(env => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>
        ) : (
          <p className="text-gray-700">{environmentName ?? '—'}</p>
        )}
      </div>

      {/* Módulo — editable para consultores */}
      <div>
        <p className="text-xs text-gray-400 mb-1">Módulo EBS</p>
        {isConsultant ? (
          <select
            className="input text-sm py-1.5"
            value={module}
            disabled={saving}
            onChange={e => {
              setModule(e.target.value)
              save({ ebs_module: e.target.value || null })
            }}
          >
            <option value="">Sin módulo</option>
            {EBS_MODULES.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        ) : (
          <p className="text-gray-700">{initialModule ?? '—'}</p>
        )}
      </div>

      {assignedToName && (
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Asignado a</p>
          <p className="text-gray-700">{assignedToName}</p>
        </div>
      )}

      <div>
        <p className="text-xs text-gray-400 mb-0.5">Creado</p>
        <p className="text-gray-700">{formatDate(createdAt)}</p>
      </div>

      {/* Proyecto */}
      <div>
        <p className="text-xs text-gray-400 mb-1">Proyecto</p>
        {isConsultant ? (
          <select
            className="input text-sm py-1.5"
            value={projectId}
            disabled={saving}
            onChange={e => {
              setProjectId(e.target.value)
              save({ project_id: e.target.value || null })
            }}
          >
            <option value="">Sin proyecto</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        ) : (
          <p className="text-gray-700">{projects.find(p => p.id === projectId)?.name ?? '—'}</p>
        )}
      </div>

      {saving && <p className="text-xs text-indigo-500">Guardando...</p>}
    </div>
  )
}
