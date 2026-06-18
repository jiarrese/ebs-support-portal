'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import type { TimeEntryRow } from './TimeEntryTable'

type Entry = TimeEntryRow

// ─── Helpers ────────────────────────────────────────────────────────────────

function fh(h: number) { return `${h.toFixed(1)}h` }
function fd(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

// Agrupar por empresa → ticket (para detallado) o por empresa (para resumido)
type TicketGroup = { number: number; title: string; company: string; project: string; hours: number }
type CompanyGroup = { company: string; hours: number; billableHours: number }

function buildDetallado(entries: Entry[]): TicketGroup[] {
  const map = new Map<string, TicketGroup>()
  for (const e of entries) {
    const num = e.tickets?.number ?? 0
    const key = String(num)
    if (!map.has(key)) {
      map.set(key, {
        number: num,
        title: e.tickets?.title ?? '—',
        company: e.tickets?.companies?.name ?? '—',
        project: e.tickets?.projects?.name ?? '—',
        hours: 0,
      })
    }
    map.get(key)!.hours += e.hours
  }
  return Array.from(map.values()).sort((a, b) => a.number - b.number)
}

function buildResumido(entries: Entry[]): CompanyGroup[] {
  const map = new Map<string, CompanyGroup>()
  for (const e of entries) {
    const company = e.tickets?.companies?.name ?? 'Sin empresa'
    if (!map.has(company)) map.set(company, { company, hours: 0, billableHours: 0 })
    map.get(company)!.hours += e.hours
    if (e.billable) map.get(company)!.billableHours += e.hours
  }
  return Array.from(map.values()).sort((a, b) => b.hours - a.hours)
}

// ─── Excel ───────────────────────────────────────────────────────────────────

async function exportExcel(entries: Entry[], mode: 'detallado' | 'resumido') {
  const XLSX = await import('xlsx')

  let rows: (string | number)[][]
  let headers: string[]

  if (mode === 'detallado') {
    headers = ['Fecha', 'Ticket', 'Empresa', 'Proyecto', 'Descripción', 'Horas', 'Facturable']
    rows = entries.map(e => [
      fd(e.entry_date),
      `#${e.tickets?.number ?? ''} ${e.tickets?.title ?? ''}`.trim(),
      e.tickets?.companies?.name ?? '—',
      e.tickets?.projects?.name ?? '—',
      e.description,
      Number(e.hours.toFixed(2)),
      e.billable ? 'Sí' : 'No',
    ])
    // Fila total
    const total = entries.reduce((s, e) => s + e.hours, 0)
    rows.push(['', '', '', '', 'TOTAL', Number(total.toFixed(2)), ''])
  } else {
    headers = ['Empresa', 'Horas totales', 'Horas facturables']
    const groups = buildResumido(entries)
    rows = groups.map(g => [g.company, Number(g.hours.toFixed(2)), Number(g.billableHours.toFixed(2))])
    const totalH = groups.reduce((s, g) => s + g.hours, 0)
    const totalB = groups.reduce((s, g) => s + g.billableHours, 0)
    rows.push(['TOTAL', Number(totalH.toFixed(2)), Number(totalB.toFixed(2))])
  }

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, mode === 'detallado' ? 'Detallado' : 'Resumido')
  XLSX.writeFile(wb, `horas-${mode}.xlsx`)
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

async function exportPdf(entries: Entry[], mode: 'detallado' | 'resumido') {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const title = mode === 'detallado' ? 'Horas registradas — Detallado' : 'Horas registradas — Resumido'
  const fecha = new Date().toLocaleDateString('es-AR')

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, 16)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120)
  doc.text(`Generado: ${fecha}`, 14, 22)
  doc.setTextColor(0)

  if (mode === 'detallado') {
    const total = entries.reduce((s, e) => s + e.hours, 0)
    const body = entries.map(e => [
      fd(e.entry_date),
      `#${e.tickets?.number ?? ''} ${e.tickets?.title ?? ''}`.trim(),
      e.tickets?.companies?.name ?? '—',
      e.tickets?.projects?.name ?? '—',
      e.description,
      fh(e.hours),
      e.billable ? 'Sí' : 'No',
    ])
    autoTable(doc, {
      startY: 27,
      head: [['Fecha', 'Ticket', 'Empresa', 'Proyecto', 'Descripción', 'Horas', 'Fact.']],
      body,
      foot: [['', '', '', '', 'TOTAL', fh(total), '']],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [237, 233, 254], textColor: [55, 48, 163], fontStyle: 'bold' },
      columnStyles: { 5: { halign: 'right' }, 6: { halign: 'center' } },
    })
  } else {
    const groups = buildResumido(entries)
    const totalH = groups.reduce((s, g) => s + g.hours, 0)
    const totalB = groups.reduce((s, g) => s + g.billableHours, 0)
    const body = groups.map(g => [g.company, fh(g.hours), fh(g.billableHours)])
    autoTable(doc, {
      startY: 27,
      head: [['Empresa', 'Horas totales', 'Horas facturables']],
      body,
      foot: [['TOTAL', fh(totalH), fh(totalB)]],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [237, 233, 254], textColor: [55, 48, 163], fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    })
  }

  doc.save(`horas-${mode}.pdf`)
}

// ─── Component ───────────────────────────────────────────────────────────────

type Action = 'excel-detallado' | 'excel-resumido' | 'pdf-detallado' | 'pdf-resumido'

export default function ExportHorasButton({ entries }: { entries: Entry[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<Action | null>(null)

  async function handle(action: Action) {
    setLoading(action)
    setOpen(false)
    const [format, mode] = action.split('-') as ['excel' | 'pdf', 'detallado' | 'resumido']
    if (format === 'excel') await exportExcel(entries, mode)
    else await exportPdf(entries, mode)
    setLoading(null)
  }

  const options: { action: Action; label: string }[] = [
    { action: 'excel-detallado', label: 'Excel — Detallado (por entrada)' },
    { action: 'excel-resumido',  label: 'Excel — Resumido (por empresa)' },
    { action: 'pdf-detallado',   label: 'PDF — Detallado (por entrada)' },
    { action: 'pdf-resumido',    label: 'PDF — Resumido (por empresa)' },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={!!loading || entries.length === 0}
        className="btn-secondary py-1.5 text-sm gap-2"
      >
        <Download className="w-4 h-4" />
        {loading ? 'Exportando...' : 'Exportar'}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[220px]">
            {options.map(o => (
              <button
                key={o.action}
                onClick={() => handle(o.action)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
