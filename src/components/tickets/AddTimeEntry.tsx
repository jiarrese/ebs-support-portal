'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AddTimeEntry({ ticketId }: { ticketId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ description: '', hours: '', entry_date: new Date().toISOString().split('T')[0], billable: true })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('time_entries').insert({
      ticket_id: ticketId, consultant_id: user!.id,
      description: form.description, hours: parseFloat(form.hours),
      entry_date: form.entry_date, billable: form.billable
    })
    setForm({ description: '', hours: '', entry_date: new Date().toISOString().split('T')[0], billable: true })
    setOpen(false); setLoading(false); router.refresh()
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="btn-secondary w-full py-1.5 text-xs justify-center">
      + Registrar horas
    </button>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-2 pt-2 border-t border-gray-100">
      <input className="input text-xs" placeholder="Descripción de la tarea" value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
      <div className="grid grid-cols-2 gap-2">
        <input className="input text-xs" type="number" step="0.25" min="0.25" placeholder="Horas (ej: 1.5)"
          value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} required />
        <input className="input text-xs" type="date" value={form.entry_date}
          onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} required />
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
        <input type="checkbox" checked={form.billable} onChange={e => setForm(f => ({ ...f, billable: e.target.checked }))}
          className="rounded border-gray-300 text-indigo-600" />
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
