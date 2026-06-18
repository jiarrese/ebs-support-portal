'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatHours } from '@/lib/utils'
import { Pencil, Trash2, X, Check } from 'lucide-react'

export type TimeEntryRow = {
  id: string
  description: string
  hours: number
  entry_date: string
  billable: boolean
  tickets?: { number: number; title: string; companies?: { name: string } | null; projects?: { name: string } | null } | null
  profiles?: { full_name: string } | null
}

function parseHours(raw: string): number | null {
  const trimmed = raw.trim().replace(',', ':')
  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})$/)
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10)
    const m = parseInt(colonMatch[2], 10)
    if (m >= 60) return null
    return h + m / 60
  }
  const decimal = parseFloat(trimmed)
  if (!isNaN(decimal) && decimal > 0) return decimal
  return null
}

function hoursToDisplay(h: number) {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins > 0 ? `${hrs}:${String(mins).padStart(2, '0')}` : `${hrs}`
}

export default function TimeEntryTable({ entries }: { entries: TimeEntryRow[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ description: '', hours: '', entry_date: '', billable: true })
  const [saving, setSaving] = useState(false)
  const [hoursError, setHoursError] = useState('')

  function startEdit(entry: TimeEntryRow) {
    setEditForm({
      description: entry.description,
      hours: hoursToDisplay(entry.hours),
      entry_date: entry.entry_date,
      billable: entry.billable,
    })
    setEditingId(entry.id)
    setHoursError('')
  }

  async function saveEdit(entryId: string) {
    const decimal = parseHours(editForm.hours)
    if (decimal === null) { setHoursError('Formato inválido (ej: 1:30 o 1.5)'); return }
    setSaving(true)
    const supabase = createClient()
    await supabase.from('time_entries').update({
      description: editForm.description,
      hours: decimal,
      entry_date: editForm.entry_date,
      billable: editForm.billable,
    }).eq('id', entryId)
    setSaving(false)
    setEditingId(null)
    router.refresh()
  }

  async function deleteEntry(entry: TimeEntryRow) {
    if (!confirm(`¿Eliminar "${entry.description}" (${formatHours(entry.hours)})?`)) return
    const supabase = createClient()
    await supabase.from('time_entries').delete().eq('id', entry.id)
    router.refresh()
  }

  if (entries.length === 0) {
    return (
      <tr>
        <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
          Sin registros para este período
        </td>
      </tr>
    )
  }

  return (
    <>
      {entries.map(entry => (
        editingId === entry.id ? (
          <tr key={entry.id} className="bg-indigo-50">
            <td className="px-4 py-2" colSpan={8}>
              <div className="flex flex-wrap gap-2 items-start">
                <input
                  className="input text-xs py-1 flex-1 min-w-[160px]"
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Descripción"
                />
                <div>
                  <input
                    className={`input text-xs py-1 w-24 ${hoursError ? 'border-red-400' : ''}`}
                    placeholder="1:30 o 1.5"
                    value={editForm.hours}
                    onChange={e => { setEditForm(f => ({ ...f, hours: e.target.value })); setHoursError('') }}
                  />
                  {hoursError && <p className="text-[10px] text-red-500 mt-0.5">{hoursError}</p>}
                </div>
                <input
                  className="input text-xs py-1 w-32"
                  type="date"
                  value={editForm.entry_date}
                  onChange={e => setEditForm(f => ({ ...f, entry_date: e.target.value }))}
                />
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer self-center">
                  <input type="checkbox" checked={editForm.billable}
                    onChange={e => setEditForm(f => ({ ...f, billable: e.target.checked }))}
                    className="rounded border-gray-300 text-indigo-600" />
                  Facturable
                </label>
                <div className="flex gap-1 self-center">
                  <button onClick={() => saveEdit(entry.id)} disabled={saving}
                    className="btn-primary py-1 px-2.5 text-xs gap-1">
                    <Check className="w-3.5 h-3.5" /> Guardar
                  </button>
                  <button onClick={() => setEditingId(null)} className="btn-secondary py-1 px-2.5 text-xs">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </td>
          </tr>
        ) : (
          <tr key={entry.id} className="hover:bg-gray-50 group">
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
            <td className="px-4 py-3">
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(entry)} title="Editar"
                  className="p-1 text-gray-400 hover:text-indigo-600 rounded">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteEntry(entry)} title="Eliminar"
                  className="p-1 text-gray-400 hover:text-red-600 rounded">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </td>
          </tr>
        )
      ))}
    </>
  )
}
