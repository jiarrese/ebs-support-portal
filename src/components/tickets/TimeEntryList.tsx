'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDateOnly, formatHours } from '@/lib/utils'
import { Pencil, Trash2, X, Check } from 'lucide-react'
import type { TimeEntry } from '@/lib/types'

type Entry = TimeEntry & { profiles?: { full_name: string } }

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

export default function TimeEntryList({ entries }: { entries: Entry[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ description: '', hours: '', entry_date: '', billable: true })
  const [saving, setSaving] = useState(false)
  const [hoursError, setHoursError] = useState('')

  function startEdit(entry: Entry) {
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

  async function deleteEntry(entry: Entry) {
    if (!confirm(`¿Eliminar "${entry.description}" (${formatHours(entry.hours)})?`)) return
    const supabase = createClient()
    await supabase.from('time_entries').delete().eq('id', entry.id)
    router.refresh()
  }

  if (entries.length === 0) return null

  return (
    <div className="space-y-1.5">
      {entries.map(entry => (
        editingId === entry.id ? (
          <div key={entry.id} className="bg-indigo-50 rounded-lg p-2 space-y-1.5 border border-indigo-100">
            <input
              className="input text-xs py-1"
              value={editForm.description}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Descripción"
              required
            />
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <input
                  className={`input text-xs py-1 ${hoursError ? 'border-red-400 focus:ring-red-400' : ''}`}
                  placeholder="1:30 o 1.5"
                  value={editForm.hours}
                  onChange={e => { setEditForm(f => ({ ...f, hours: e.target.value })); setHoursError('') }}
                />
                {hoursError && <p className="text-[10px] text-red-500 mt-0.5">{hoursError}</p>}
              </div>
              <input
                className="input text-xs py-1"
                type="date"
                value={editForm.entry_date}
                onChange={e => setEditForm(f => ({ ...f, entry_date: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.billable}
                  onChange={e => setEditForm(f => ({ ...f, billable: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 w-3 h-3"
                />
                Facturable
              </label>
              <div className="flex gap-1">
                <button
                  onClick={() => saveEdit(entry.id)}
                  disabled={saving}
                  className="btn-primary py-0.5 px-2 text-xs gap-1"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => setEditingId(null)} className="btn-secondary py-0.5 px-2 text-xs">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div key={entry.id} className="text-xs text-gray-600 flex items-center gap-1 group py-0.5">
            <div className="flex-1 min-w-0">
              <span className="truncate block">{entry.description}</span>
              <span className="text-[10px] text-gray-400">{formatDateOnly(entry.entry_date)}</span>
            </div>
            <span className="font-medium text-gray-800 flex-shrink-0">{formatHours(entry.hours)}</span>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={() => startEdit(entry)}
                className="p-0.5 text-gray-400 hover:text-indigo-600 rounded"
                title="Editar"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={() => deleteEntry(entry)}
                className="p-0.5 text-gray-400 hover:text-red-600 rounded"
                title="Eliminar"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        )
      ))}
    </div>
  )
}
