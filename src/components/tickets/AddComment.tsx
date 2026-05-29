'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AddComment({ ticketId, isConsultant }: { ticketId: string; isConsultant: boolean }) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('ticket_comments').insert({
      ticket_id: ticketId, author_id: user!.id,
      body: body.trim(), internal
    })
    setBody(''); setInternal(false); setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        className="input min-h-[80px] resize-none text-sm"
        placeholder="Escribí un comentario..."
        value={body}
        onChange={e => setBody(e.target.value)}
      />
      <div className="flex items-center justify-between">
        {isConsultant && (
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600" />
            Nota interna (no visible al cliente)
          </label>
        )}
        <button type="submit" className="btn-primary py-1.5 text-xs ml-auto" disabled={loading || !body.trim()}>
          {loading ? 'Enviando...' : 'Comentar'}
        </button>
      </div>
    </form>
  )
}
