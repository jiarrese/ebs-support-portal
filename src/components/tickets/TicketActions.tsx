'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2 } from 'lucide-react'
import type { TicketStatus } from '@/lib/types'

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'open',           label: 'Abierto' },
  { value: 'in_progress',    label: 'En curso' },
  { value: 'pending_client', label: 'Esperando cliente' },
  { value: 'resolved',       label: 'Resuelto' },
  { value: 'closed',         label: 'Cerrado' },
]

export default function TicketActions({ ticket }: { ticket: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function changeStatus(status: TicketStatus) {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('tickets').update({
      status,
      resolved_at: status === 'resolved' ? new Date().toISOString() : null,
      closed_at:   status === 'closed'   ? new Date().toISOString() : null,
    }).eq('id', ticket.id)
    setLoading(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar el ticket #${ticket.number}? Esta acción no se puede deshacer: se borran también sus comentarios, horas y adjuntos.`)) return
    setDeleting(true)
    const supabase = createClient()

    const { data: attachments } = await supabase
      .from('ticket_attachments').select('storage_path').eq('ticket_id', ticket.id)
    if (attachments && attachments.length > 0) {
      await supabase.storage.from('ticket-attachments').remove(attachments.map(a => a.storage_path))
    }

    await supabase.from('ticket_attachments').delete().eq('ticket_id', ticket.id)
    await supabase.from('ticket_comments').delete().eq('ticket_id', ticket.id)
    await supabase.from('time_entries').delete().eq('ticket_id', ticket.id)
    const { error } = await supabase.from('tickets').delete().eq('id', ticket.id)

    if (error) {
      alert(`No se pudo eliminar el ticket: ${error.message}`)
      setDeleting(false)
      return
    }

    router.push('/tickets')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="input py-1.5 text-sm"
        defaultValue={ticket.status}
        onChange={e => changeStatus(e.target.value as TicketStatus)}
        disabled={loading}
      >
        {STATUS_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <button
        onClick={handleDelete}
        disabled={deleting}
        title="Eliminar ticket"
        className="btn-secondary py-1.5 px-2.5 text-sm text-red-600 hover:bg-red-50 hover:border-red-200"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
