import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { formatDate, formatDateTime, formatHours } from '@/lib/utils'
import TicketActions from '@/components/tickets/TicketActions'
import AddComment from '@/components/tickets/AddComment'
import AddTimeEntry from '@/components/tickets/AddTimeEntry'
import TimeEntryList from '@/components/tickets/TimeEntryList'
import TicketAttachments from '@/components/tickets/TicketAttachments'
import TicketSidebarEditor from '@/components/tickets/TicketSidebarEditor'
import ClientNotifyCheck from '@/components/tickets/ClientNotifyCheck'
import type { TicketComment, TimeEntry } from '@/lib/types'

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()

  const { data: ticket } = await supabase
    .from('ticket_summary').select('*').eq('id', params.id).single()

  if (!ticket) notFound()

  // ticket_summary no incluye description ni campos editables — los traemos de la tabla base
  const { data: ticketBase } = await supabase
    .from('tickets')
    .select('description, company_id, environment_id, ebs_module, priority, project_id, source_ref, notify_client, client_notified_at')
    .eq('id', params.id).single()

  const { data: comments } = await supabase
    .from('ticket_comments')
    .select('*, profiles(full_name, role)')
    .eq('ticket_id', params.id)
    .order('created_at', { ascending: true })

  const { data: timeEntries } = await supabase
    .from('time_entries')
    .select('*, profiles(full_name)')
    .eq('ticket_id', params.id)
    .order('entry_date', { ascending: false })

  const isConsultant = profile?.role === 'consultant'
  const totalHours = (timeEntries ?? []).reduce((acc: number, e: any) => acc + Number(e.hours), 0)

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm text-gray-400 font-mono">#{ticket.number}</span>
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{ticket.title}</h1>
        </div>
        {isConsultant && <TicketActions ticket={ticket} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          {/* Descripción */}
          <div className="card p-5">
            <h2 className="text-sm font-medium text-gray-700 mb-3">Descripción</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {ticketBase?.description ?? 'Sin descripción.'}
            </p>
          </div>

          {/* Adjuntos */}
          <TicketAttachments ticketId={params.id} />

          {/* Comentarios */}
          <div className="card p-5">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Actividad</h2>
            <div className="space-y-4">
              {(comments as (TicketComment & { profiles: any })[] ?? []).map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 flex-shrink-0 mt-0.5">
                    {comment.profiles?.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{comment.profiles?.full_name}</span>
                      {comment.internal && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">interno</span>
                      )}
                      {comment.sent_to_client && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">enviado por mail</span>
                      )}
                      <span className="text-xs text-gray-400">{formatDateTime(comment.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{comment.body}</p>
                  </div>
                </div>
              ))}
              {(!comments || comments.length === 0) && (
                <p className="text-sm text-gray-400">Sin comentarios aún.</p>
              )}
            </div>
            <div className="mt-5 pt-5 border-t border-gray-100">
              <AddComment ticketId={params.id} isConsultant={isConsultant} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Info editable */}
          <TicketSidebarEditor
            ticketId={params.id}
            companyId={ticketBase?.company_id ?? ''}
            companyName={ticket.company_name}
            environmentId={ticketBase?.environment_id ?? null}
            environmentName={ticket.environment_name}
            ebsModule={ticketBase?.ebs_module}
            projectId={ticketBase?.project_id ?? null}
            assignedToName={ticket.assigned_to_name}
            createdAt={ticket.created_at}
            isConsultant={isConsultant}
          />

          {/* Aviso de creación al cliente — solo tickets creados por el agente de mail */}
          {isConsultant && ticketBase?.source_ref && (
            <ClientNotifyCheck
              ticketId={params.id}
              notifyClient={ticketBase.notify_client}
              clientNotifiedAt={ticketBase.client_notified_at}
            />
          )}

          {/* Horas (solo consultor) */}
          {isConsultant && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-gray-700">Horas registradas</h2>
                <span className="text-lg font-semibold text-indigo-600">{formatHours(totalHours)}</span>
              </div>
              <div className="mb-4">
                <TimeEntryList entries={(timeEntries as (TimeEntry & { profiles: any })[] ?? [])} />
              </div>
              <AddTimeEntry ticketId={params.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
