'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Play, Pause, Square } from 'lucide-react'

interface TimerRow {
  ticket_id: string
  status: 'running' | 'paused'
  started_at: string | null
  accumulated_seconds: number
}

function elapsedSeconds(timer: TimerRow): number {
  if (timer.status === 'running' && timer.started_at) {
    return timer.accumulated_seconds + Math.floor((Date.now() - new Date(timer.started_at).getTime()) / 1000)
  }
  return timer.accumulated_seconds
}

function formatHMS(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
}

function secondsToHHMM(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60)
  return `${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2, '0')}`
}

export default function TicketTimer({ ticketId, onStop }: { ticketId: string; onStop: (hoursHHMM: string) => void }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [timer, setTimer] = useState<TimerRow | null>(null)
  const [otherTicketNumber, setOtherTicketNumber] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [, forceTick] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      const { data } = await supabase
        .from('time_entry_timers')
        .select('ticket_id, status, started_at, accumulated_seconds')
        .eq('consultant_id', user.id)
        .maybeSingle()
      if (data) {
        setTimer(data as TimerRow)
        if (data.ticket_id !== ticketId) {
          const { data: other } = await supabase.from('tickets').select('number').eq('id', data.ticket_id).single()
          setOtherTicketNumber(other?.number ?? null)
        }
      }
      setLoading(false)
    })
  }, [ticketId])

  useEffect(() => {
    if (!timer || timer.status !== 'running' || timer.ticket_id !== ticketId) return
    const id = setInterval(() => forceTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [timer, ticketId])

  async function start() {
    if (!userId) return
    setBusy(true)
    const supabase = createClient()
    const now = new Date().toISOString()
    const { error } = await supabase.from('time_entry_timers').insert({
      consultant_id: userId, ticket_id: ticketId, status: 'running', started_at: now, accumulated_seconds: 0,
    })
    if (!error) setTimer({ ticket_id: ticketId, status: 'running', started_at: now, accumulated_seconds: 0 })
    setBusy(false)
  }

  async function pause() {
    if (!userId || !timer) return
    setBusy(true)
    const supabase = createClient()
    const newAccum = elapsedSeconds(timer)
    await supabase.from('time_entry_timers')
      .update({ status: 'paused', started_at: null, accumulated_seconds: newAccum })
      .eq('consultant_id', userId)
    setTimer({ ...timer, status: 'paused', started_at: null, accumulated_seconds: newAccum })
    setBusy(false)
  }

  async function resume() {
    if (!userId || !timer) return
    setBusy(true)
    const supabase = createClient()
    const now = new Date().toISOString()
    await supabase.from('time_entry_timers').update({ status: 'running', started_at: now }).eq('consultant_id', userId)
    setTimer({ ...timer, status: 'running', started_at: now })
    setBusy(false)
  }

  async function stop() {
    if (!userId || !timer) return
    setBusy(true)
    const total = elapsedSeconds(timer)
    const supabase = createClient()
    await supabase.from('time_entry_timers').delete().eq('consultant_id', userId)
    setTimer(null)
    setBusy(false)
    if (Math.round(total / 60) > 0) onStop(secondsToHHMM(total))
  }

  if (loading) return null

  if (timer && timer.ticket_id !== ticketId) {
    return (
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        Tenés un timer activo en el ticket #{otherTicketNumber ?? '?'} — pausalo o parealo antes de iniciar uno acá.
      </p>
    )
  }

  if (!timer) {
    return (
      <button onClick={start} disabled={busy} className="btn-secondary w-full py-1.5 text-xs justify-center gap-1.5">
        <Play className="w-3.5 h-3.5" /> Iniciar timer
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
      <span className={`font-mono text-sm font-medium ${timer.status === 'running' ? 'text-indigo-600' : 'text-gray-500'}`}>
        {formatHMS(elapsedSeconds(timer))}
      </span>
      <div className="flex gap-1 ml-auto">
        {timer.status === 'running' ? (
          <button onClick={pause} disabled={busy} title="Pausar"
            className="p-1.5 text-gray-500 hover:text-indigo-600 rounded-lg hover:bg-white">
            <Pause className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button onClick={resume} disabled={busy} title="Reanudar"
            className="p-1.5 text-gray-500 hover:text-indigo-600 rounded-lg hover:bg-white">
            <Play className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={stop} disabled={busy} title="Parar"
          className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg hover:bg-white">
          <Square className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
