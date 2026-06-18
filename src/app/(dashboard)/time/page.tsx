import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatHours } from '@/lib/utils'
import HoursCharts from '@/components/charts/HoursCharts'
import TimeEntryTable from '@/components/time/TimeEntryTable'
import ExportHorasButton from '@/components/time/ExportHorasButton'

export default async function TimePage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; company?: string; project?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  if (profile?.role !== 'consultant') redirect('/tickets')

  // Período: defecto últimos 3 meses
  const now = new Date()
  const defaultTo   = now.toISOString().slice(0, 7)
  const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 7)

  const fromMonth = searchParams.from ?? defaultFrom
  const toMonth   = searchParams.to   ?? defaultTo

  const fromDate = `${fromMonth}-01`
  const [ty, tm] = toMonth.split('-').map(Number)
  const toDate   = `${toMonth}-${String(new Date(ty, tm, 0).getDate()).padStart(2, '0')}`

  // Listas para filtros
  const [{ data: companies }, { data: projects }] = await Promise.all([
    supabase.from('companies').select('id, name').eq('active', true).order('name'),
    supabase.from('projects').select('id, name').eq('active', true).order('name'),
  ])

  // Filtro por empresa y/o proyecto: pre-fetch ticket IDs
  let ticketFilter: string[] | null = null

  if (searchParams.company || searchParams.project) {
    let companyTicketIds: string[] | null = null
    let projectTicketIds: string[] | null = null

    if (searchParams.company) {
      const { data } = await supabase.from('tickets').select('id').eq('company_id', searchParams.company)
      companyTicketIds = (data ?? []).map((t: any) => t.id)
    }
    if (searchParams.project) {
      const { data } = await supabase.from('tickets').select('id').eq('project_id', searchParams.project)
      projectTicketIds = (data ?? []).map((t: any) => t.id)
    }

    if (companyTicketIds && projectTicketIds) {
      const set = new Set(projectTicketIds)
      ticketFilter = companyTicketIds.filter(id => set.has(id))
    } else {
      ticketFilter = companyTicketIds ?? projectTicketIds ?? []
    }
  }

  let query = supabase
    .from('time_entries')
    .select('*, tickets(number, title, companies(name), projects(name)), profiles(full_name)')
    .gte('entry_date', fromDate)
    .lte('entry_date', toDate)
    .order('entry_date', { ascending: false })
    .limit(500)

  if (ticketFilter !== null) {
    const ids = ticketFilter.length > 0 ? ticketFilter : ['00000000-0000-0000-0000-000000000000']
    query = query.in('ticket_id', ids)
  }

  const { data: entries } = await query

  const total = (entries ?? []).reduce((acc: number, e: any) => acc + Number(e.hours), 0)

  const chartEntries = (entries ?? []).map((e: any) => ({
    hours: Number(e.hours),
    entry_date: e.entry_date,
    tickets: e.tickets,
  }))

  const tableEntries = (entries ?? []).map((e: any) => ({
    id: e.id,
    description: e.description,
    hours: Number(e.hours),
    entry_date: e.entry_date,
    billable: e.billable,
    tickets: e.tickets,
    profiles: e.profiles,
  }))

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Horas registradas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Total período: {formatHours(total)}</p>
        </div>
        <ExportHorasButton entries={tableEntries} />
      </div>

      {/* Filtros */}
      <form className="flex flex-wrap gap-2 mb-5 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input type="month" name="from" defaultValue={fromMonth} className="input py-1.5 text-sm w-auto" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input type="month" name="to" defaultValue={toMonth} className="input py-1.5 text-sm w-auto" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Empresa</label>
          <select name="company" defaultValue={searchParams.company ?? ''} className="input py-1.5 text-sm">
            <option value="">Todas</option>
            {(companies ?? []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Proyecto</label>
          <select name="project" defaultValue={searchParams.project ?? ''} className="input py-1.5 text-sm">
            <option value="">Todos</option>
            {(projects ?? []).map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-secondary py-1.5 text-sm">Filtrar</button>
      </form>

      {/* Gráfico */}
      <HoursCharts entries={chartEntries} />

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Fecha</th>
                <th className="text-left px-4 py-3 font-medium">Ticket</th>
                <th className="text-left px-4 py-3 font-medium">Empresa</th>
                <th className="text-left px-4 py-3 font-medium">Proyecto</th>
                <th className="text-left px-4 py-3 font-medium">Descripción</th>
                <th className="text-right px-4 py-3 font-medium">Horas</th>
                <th className="text-left px-4 py-3 font-medium">Facturable</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <TimeEntryTable entries={tableEntries} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
