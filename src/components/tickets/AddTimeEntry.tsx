'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Acepta "H:MM" o "H,MM" o decimal. Devuelve horas decimales o null si es inválido.
function parseHours(raw: string): number | null {
  const trimmed = raw.trim().replace(',', ':')
  // Formato H:MM
  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})$/)
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10)
    const m = parseInt(colonMatch[2], 10)
    if (m >= 60) return null
    return h + m / 60
  }
  // Formato decimal
  const decimal = parseFloat(trimmed)
  if (!isNaN(decimal) && decimal > 0) return decimal
  return null
}

function formatPreview(raw: string): string {
  const h = parseHours(raw)
  if (h === null || raw === '') return ''
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  if (mins === 0) return `${hrs}h`
  return `${hrs}h ${mins}m`
}

export default function AddTimeEntry({ ticketId }: { ticketId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    description: '',
    hours: '',
    entry_date: new Date().toISOString().split('T')[0],
    billable: true,
  })
  const [hoursError, setHoursError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleHoursChange(value: string) {
    setForm(f => ({ ...f, hours: value }))
    setHoursError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const decimal = parseHours(form.hours)
    if (decimal === null) {
      setHoursError('Formato inválido. Usá H:MM (ej: 1:30) o decimal (ej: 1.5)')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('time_entries').insert({
      ticket_id: ticketId,
      consultant_id: user!.id,
      description: form.description,
      hours: decimal,
      entry_date: form.entry_date,
      billable: form.billable,
    })
    setForm({ description: '', hours: '', entry_date: new Date().toISOString().split('T')[0], billable: true })
    setHoursError('')
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="btn-secondary w-full py-1.5 text-xs justify-center">
      + Registrar horas
    </button>
  )

  const preview = formatPreview(form.hours)

  return (
    <form onSubmit={handleSubmit} className="space-y-2 pt-2 border-t border-gray-100">
      <input
        className="input text-xs"
        placeholder="Descripción de la tarea"
        value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="relative">
            <input
              className={`input text-xs pr-10 ${hoursError ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : ''}`}
              placeholder="1:30 o 1.5"
              value={form.hours}
              onChange={e => handleHoursChange(e.target.value)}
              required
            />
            {preview && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-indigo-500 font-medium pointer-events-none">
                {preview}
              </span>
            )}
          </div>
          {hoursError && (
            <p className="text-xs text-red-500 mt-0.5">{hoursError}</p>
          )}
        </div>
        <input
          className="input text-xs"
          type="date"
          value={form.entry_date}
          onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))}
          required
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
        <input
          type="checkbox"
          checked={form.billable}
          onChange={e => setForm(f => ({ ...f, billable: e.target.checked }))}
          className="rounded border-gray-300 text-indigo-600"
        />
        Facturable
      </label>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary py-1 text-xs flex-1 justify-center" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" className="btn-secondary py-1 text-xs" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
