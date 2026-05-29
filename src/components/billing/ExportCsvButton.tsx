'use client'
import type { BillingSummary } from '@/lib/types'

export default function ExportCsvButton({ data, month }: { data: BillingSummary[]; month: string }) {
  function handleExport() {
    const headers = ['Empresa', 'Horas', 'Tarifa/h', 'Moneda', 'Subtotal']
    const rows = data.map(r => [r.company_name, r.total_hours.toFixed(2), r.hourly_rate.toFixed(2), r.currency, r.total_amount.toFixed(2)])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `facturacion-${month}.csv`
    a.click()
  }

  return (
    <button onClick={handleExport} className="btn-secondary py-1.5 text-sm">
      ↓ Exportar CSV
    </button>
  )
}
