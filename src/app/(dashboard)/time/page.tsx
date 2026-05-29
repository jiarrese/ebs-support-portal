import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate, formatHours } from '@/lib/utils'

export default async function TimePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  if (profile?.role !== 'consultant') redirect('/tickets')

  const { data: entries } = await supabase
    .from('time_entries')
    .select('*, tickets(number, title, companies(name)), profiles(full_name)')
    .order('entry_date', { ascending: false })
    .limit(100)

  const total = (entries ?? []).reduce((acc: number, e: any) => acc + Number(e.hours), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Horas registradas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Total: {formatHours(total)}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-medium">Fecha</th>
              <th className="text-left px-4 py-3 font-medium">Ticket</th>
              <th className="text-left px-4 py-3 font-medium">Empresa</th>
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
                  #{entry.tickets?.number} <span className="text-gray-500 text-xs">{entry.tickets?.title}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">{entry.tickets?.companies?.name}</td>
                <td className="px-4 py-3 text-gray-600">{entry.description}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-800">{formatHours(entry.hours)}</td>
                <td className="px-4 py-3">
                  {entry.billable
                    ? <span className="badge bg-green-100 text-green-700">Sí</span>
                    : <span className="badge bg-gray-100 text-gray-500">No</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
