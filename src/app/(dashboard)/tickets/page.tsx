import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { FilterSelect } from '@/components/tickets/FilterSelect'
import { DateRangeFilter } from '@/components/tickets/DateRangeFilter'
import { SortableHeader, type SortDir } from '@/components/tickets/SortableHeader'
import { formatDate, formatHours } from '@/lib/utils'
import { Plus } from 'lucide-react'
import type { TicketSummary, TicketPriority, TicketStatus } from '@/lib/types'

const PRIORITY_ORDER: Record<TicketPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 }
const STATUS_ORDER: Record<TicketStatus, number> = { open: 0, in_progress: 1, pending_client: 2, resolved: 3, closed: 4 }

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: { status?: string; company?: string; priority?: string; project?: string; from?: string; to?: string; sort?: string; dir?: string }
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

  // ticket_summary no expone company_id ni project_id directamente — filtramos via tickets
  if (searchParams.company || searchParams.project) {
    let companyIds: string[] | null = null
    let projectIds: string[] | null = null

    if (searchParams.company) {
      const { data } = await supabase.from('tickets').select('id').eq('company_id', searchParams.company)
      companyIds = (data ?? []).map((t: any) => t.id)
    }
    if (searchParams.project) {
      const { data } = await supabase.from('tickets').select('id').eq('project_id', searchParams.project)
      projectIds = (data ?? []).map((t: any) => t.id)
    }

    let ids: string[]
    if (companyIds && projectIds) {
      const set = new Set(projectIds)
      ids = companyIds.filter(id => set.has(id))
    } else {
      ids = companyIds ?? projectIds ?? []
    }
    query = ids.length > 0 ? query.in('id', ids) : query.in('id', ['00000000-0000-0000-0000-000000000000'])
  }

  // Filtro por fecha de creación
  if (searchParams.from) query = query.gte('created_at', searchParams.from)
  if (searchParams.to)   query = query.lte('created_at', searchParams.to + 'T23:59:59')

  const { data: tickets } = await query
  const { data: companies } = await supabase.from('companies').select('id, name').eq('active', true)
  const { data: projects }  = await supabase.from('projects').select('id, name').eq('active', true).order('name')

  // Proyecto por ticket (ticket_summary no incluye project)
  const ticketIds = (tickets ?? []).map((t: any) => t.id)
  const { data: ticketProjects } = ticketIds.length > 0
    ? await supabase.from('tickets').select('id, projects(id, name)').in('id', ticketIds).not('project_id', 'is', null)
    : { data: [] }
  const projectByTicket: Record<string, string> = {}
  ;(ticketProjects ?? []).forEach((t: any) => {
    if (t.projects) projectByTicket[t.id] = t.projects.name
  })

  // Orden por columna (incluye proyecto, que no viene de ticket_summary)
  const sortField = searchParams.sort ?? 'updated_at'
  const sortDir: SortDir = searchParams.dir === 'asc' ? 'asc' : 'desc'
  const dirMultiplier = sortDir === 'asc' ? 1 : -1

  const sortedTickets = [...(tickets as TicketSummary[] ?? [])].sort((a, b) => {
    let cmp = 0
    switch (sortField) {
      case 'number':   cmp = a.number - b.number; break
      case 'title':    cmp = a.title.localeCompare(b.title); break
      case 'company':  cmp = a.company_name.localeCompare(b.company_name); break
      case 'project':  cmp = (projectByTicket[a.id] ?? '').localeCompare(projectByTicket[b.id] ?? ''); break
      case 'module':   cmp = (a.ebs_module ?? '').localeCompare(b.ebs_module ?? ''); break
      case 'priority': cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]; break
      case 'hours':    cmp = a.total_hours - b.total_hours; break
      case 'status':   cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]; break
      case 'updated_at':
      default:         cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
    }
    return cmp * dirMultiplier
  })

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
      <div className="flex gap-3 mb-4 flex-wrap items-center">
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
        <FilterSelect name="project" label="Proyecto" current={searchParams.project} options={
          (projects ?? []).map(p => ({ value: p.id, label: p.name }))
        } />
        <DateRangeFilter from={searchParams.from} to={searchParams.to} />
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-medium">
                <SortableHeader field="number" label="#" sort={sortField} dir={sortDir} searchParams={searchParams} />
              </th>
              <th className="text-left px-4 py-3 font-medium">
                <SortableHeader field="title" label="Título" sort={sortField} dir={sortDir} searchParams={searchParams} />
              </th>
              <th className="text-left px-4 py-3 font-medium">
                <SortableHeader field="company" label="Empresa / Ambiente" sort={sortField} dir={sortDir} searchParams={searchParams} />
              </th>
              <th className="text-left px-4 py-3 font-medium">
                <SortableHeader field="project" label="Proyecto" sort={sortField} dir={sortDir} searchParams={searchParams} />
              </th>
              <th className="text-left px-4 py-3 font-medium">
                <SortableHeader field="module" label="Módulo" sort={sortField} dir={sortDir} searchParams={searchParams} />
              </th>
              <th className="text-left px-4 py-3 font-medium">
                <SortableHeader field="priority" label="Prioridad" sort={sortField} dir={sortDir} searchParams={searchParams} />
              </th>
              <th className="text-left px-4 py-3 font-medium">
                <SortableHeader field="hours" label="Horas" sort={sortField} dir={sortDir} searchParams={searchParams} />
              </th>
              <th className="text-left px-4 py-3 font-medium">
                <SortableHeader field="status" label="Estado" sort={sortField} dir={sortDir} searchParams={searchParams} />
              </th>
              <th className="text-left px-4 py-3 font-medium">
                <SortableHeader field="updated_at" label="Actualizado" sort={sortField} dir={sortDir} searchParams={searchParams} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedTickets.map(ticket => (
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
                <td className="px-4 py-3">
                  {projectByTicket[ticket.id]
                    ? <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{projectByTicket[ticket.id]}</span>
                    : <span className="text-gray-300">—</span>
                  }
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
                <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                  No hay tickets{searchParams.status ? ' con ese filtro' : ''}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
