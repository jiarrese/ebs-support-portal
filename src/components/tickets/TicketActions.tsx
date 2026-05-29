'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
    </div>
  )
}
