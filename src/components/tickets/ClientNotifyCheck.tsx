'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils'

interface Props {
  ticketId: string
  notifyClient: boolean
  clientNotifiedAt?: string | null
}

export default function ClientNotifyCheck({ ticketId, notifyClient, clientNotifiedAt }: Props) {
  const router = useRouter()
  const [checked, setChecked] = useState(notifyClient)
  const [saving, setSaving] = useState(false)

  async function toggle(value: boolean) {
    setChecked(value)
    setSaving(true)
    const supabase = createClient()
    await supabase.from('tickets').update({ notify_client: value }).eq('id', ticketId)
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="card p-4 text-sm">
      <p className="text-xs text-gray-400 mb-2">Aviso de creación al cliente</p>
      {clientNotifiedAt ? (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          ✓ Email enviado al cliente el {formatDateTime(clientNotifiedAt)}
        </p>
      ) : (
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            disabled={saving}
            onChange={e => toggle(e.target.checked)}
            className="mt-0.5 rounded border-gray-300 text-indigo-600"
          />
          <span className="text-gray-700">
            Aprobar el envío del email de creación al cliente
            <span className="block text-xs text-gray-400 mt-0.5">
              {checked
                ? 'El agente lo enviará en su próxima corrida.'
                : 'Sin marcar, el agente no le avisa al cliente por mail.'}
            </span>
          </span>
        </label>
      )}
    </div>
  )
}
