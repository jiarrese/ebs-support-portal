import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { FilterSelect } from '@/components/tickets/FilterSelect'
import { formatDate, formatHours } from '@/lib/utils'
import { Plus } from 'lucide-react'
import type { TicketSummary } from '@/lib/types'

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: { status?: string; company?: string; priority?: string }
}) {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', (await supabase.auth.getUser()).data.user!.id)
    .single()

  let query = supabase
    .from('ticket_summary')
    .select('*')
    .order('updated_at', { ascending: false })

  if (searchParams.status)   query = query.eq('status', searchParams.status)
  if (searchParams.priority) query = query.eq('priority', searchParams.priority)
  if (searchParams.company)  query = query.eq('company_id', searchParams.company)

  const { data: tickets } = await query
  const { data: companies } = await supabase.from('companies').select('id, name').eq('active', true)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tickets</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tickets?.length ?? 0} tickets</p>
        </div>
        <Link href="/tickets/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Nuevo ticket
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <FilterSelect name="status" label="Estado" current={searchParams.status} options={[
          { value: 'open',           label: 'Abierto' },
          { value: 'in_progress',    label: 'En curso' },
          { value: 'pending_client', label: 'Esp. cliente' },
          { value: 'resolved',       label: 'Resuelto' },
          { value: 'closed',         label: 'Cerrado' },
        ]} />
        <FilterSelect name="priority" label="Prioridad" current={searchParams.priority} options={[
          { value: 'critical', label: 'Crítica' },
          { value: 'high',     label: 'Alta' },
          { value: 'medium',   label: 'Media' },
          { value: 'low',      label: 'Baja' },
        ]} />
        {profile?.role === 'consultant' && (
          <FilterSelect name="company" label="Empresa" current={searchParams.company} options={
            (companies ?? []).map(c => ({ value: c.id, label: c.name }))
          } />
        )}
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-medium">#</th>
              <th className="text-left px-4 py-3 font-medium">Título</th>
              <th className="text-left px-4 py-3 font-medium">Empresa / Ambiente</th>
              <th className="text-left px-4 py-3 font-medium">Módulo</th>
              <th className="text-left px-4 py-3 font-medium">Prioridad</th>
              <th className="text-left px-4 py-3 font-medium">Horas</th>
              <th className="text-left px-4 py-3 font-medium">Estado</th>
              <th className="text-left px-4 py-3 font-medium">Actualizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(tickets as TicketSummary[] ?? []).map(ticket => (
              <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{ticket.number}</td>
                <td className="px-4 py-3">
                  <Link href={`/tickets/${ticket.id}`} className="font-medium text-gray-900 hover:text-indigo-600">
                    {ticket.title}
                  </Link>
                  {ticket.assigned_to_name && (
                    <p className="text-xs text-gray-400 mt-0.5">{ticket.assigned_to_name}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-gray-700">{ticket.company_name}</span>
                  {ticket.environment_name && (
                    <p className="text-xs text-gray-400 mt-0.5">{ticket.environment_name}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">{ticket.ebs_module ?? '—'}</td>
                <td className="px-4 py-3"><PriorityBadge priority={ticket.priority} /></td>
                <td className="px-4 py-3 text-gray-600">{formatHours(ticket.total_hours)}</td>
                <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(ticket.updated_at)}</td>
              </tr>
            ))}
            {(!tickets || tickets.length === 0) && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  No hay tickets{searchParams.status ? ' con ese filtro' : ''}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
