import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate, formatHours } from '@/lib/utils'
import HoursCharts from '@/components/charts/HoursCharts'

export default async function TimePage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string }
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

  const { data: entries } = await supabase
    .from('time_entries')
    .select('*, tickets(number, title, companies(name), projects(name)), profiles(full_name)')
    .gte('entry_date', fromDate)
    .lte('entry_date', toDate)
    .order('entry_date', { ascending: false })
    .limit(500)

  const total = (entries ?? []).reduce((acc: number, e: any) => acc + Number(e.hours), 0)

  const chartEntries = (entries ?? []).map((e: any) => ({
    hours: Number(e.hours),
    entry_date: e.entry_date,
    tickets: e.tickets,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Horas registradas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Total período: {formatHours(total)}</p>
        </div>
        {/* Filtro de período */}
        <form className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Desde</span>
          <input type="month" name="from" defaultValue={fromMonth} className="input py-1.5 text-sm w-auto" />
          <span className="text-xs text-gray-500">Hasta</span>
          <input type="month" name="to"   defaultValue={toMonth}   className="input py-1.5 text-sm w-auto" />
          <button type="submit" className="btn-secondary py-1.5 text-xs">Filtrar</button>
        </form>
      </div>

      {/* Gráfico */}
      <HoursCharts entries={chartEntries} />

      {/* Tabla */}
      <div className="card overflow-hidden">
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(entries ?? []).map((entry: any) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(entry.entry_date)}</td>
                <td className="px-4 py-3 text-gray-700">
                  #{entry.tickets?.number}{' '}
                  <span className="text-gray-500 text-xs">{entry.tickets?.title}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">{entry.tickets?.companies?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{entry.tickets?.projects?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{entry.description}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-800">{formatHours(entry.hours)}</td>
                <td className="px-4 py-3">
                  {entry.billable
                    ? <span className="badge bg-green-100 text-green-700">Sí</span>
                    : <span className="badge bg-gray-100 text-gray-500">No</span>}
                </td>
              </tr>
            ))}
            {(entries ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  Sin registros para este período
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
