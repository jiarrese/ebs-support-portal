import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatHours, formatCurrency } from '@/lib/utils'
import ExportCsvButton from '@/components/billing/ExportCsvButton'
import MonthPicker from '@/components/billing/MonthPicker'
import BillingCharts from '@/components/charts/BillingCharts'
import type { BillingSummary, ProjectMonthlySummary } from '@/lib/types'

export default async function BillingPage({
  searchParams
}: {
  searchParams: { month?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  if (profile?.role !== 'consultant') redirect('/tickets')

  // Mes seleccionado (default: mes actual en UTC para evitar drift de timezone)
  const currentMonth = searchParams.month ?? new Date().toISOString().slice(0, 7)
  const monthStart = `${currentMonth}-01`
  // Calcula el último día sin parsear el string como Date (evita bug UTC-3 en Argentina)
  const [y, m] = currentMonth.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const monthEnd = `${currentMonth}-${String(lastDay).padStart(2, '0')}`

  const { data: billing } = await supabase
    .from('billing_summary')
    .select('*')
    .gte('month', monthStart)
    .lte('month', monthEnd)
    .order('total_amount', { ascending: false })

  const { data: projectBilling } = await supabase
    .from('project_monthly_summary')
    .select('*')
    .gte('month', monthStart)
    .lte('month', monthEnd)
    .order('total_amount', { ascending: false })

  const totals = (billing as BillingSummary[] ?? []).reduce(
    (acc, row) => ({ hours: acc.hours + row.total_hours, amount: acc.amount + row.total_amount }),
    { hours: 0, amount: 0 }
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Facturación</h1>
          <p className="text-sm text-gray-500 mt-0.5">Resumen de horas por empresa</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <MonthPicker currentMonth={currentMonth} />
          <ExportCsvButton data={billing ?? []} month={currentMonth} />
        </div>
      </div>

      {/* Gráfico */}
      <BillingCharts
        billing={billing as BillingSummary[] ?? []}
        projects={projectBilling as ProjectMonthlySummary[] ?? []}
      />

      {/* Totales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">Total horas</p>
          <p className="text-2xl font-semibold text-gray-900">{formatHours(totals.hours)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">Total facturado</p>
          <p className="text-2xl font-semibold text-indigo-600">{formatCurrency(totals.amount)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">Empresas activas</p>
          <p className="text-2xl font-semibold text-gray-900">{billing?.length ?? 0}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-medium">Empresa</th>
              <th className="text-right px-4 py-3 font-medium">Horas</th>
              <th className="text-right px-4 py-3 font-medium">Tarifa/h</th>
              <th className="text-right px-4 py-3 font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(billing as BillingSummary[] ?? []).map(row => (
              <tr key={row.company_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{row.company_name}</td>
                <td className="px-4 py-3 text-right text-gray-600">{formatHours(row.total_hours)}</td>
                <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(row.hourly_rate, row.currency)}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(row.total_amount, row.currency)}</td>
              </tr>
            ))}
            {(!billing || billing.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                  Sin registros para este período
                </td>
              </tr>
            )}
          </tbody>
          {billing && billing.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-700">Total</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700">{formatHours(totals.hours)}</td>
                <td />
                <td className="px-4 py-3 text-right font-bold text-indigo-600 text-base">{formatCurrency(totals.amount)}</td>
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </div>
    </div>
  )
}
