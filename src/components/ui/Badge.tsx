import { TicketPriority, TicketStatus, EbsEnv } from '@/lib/types'
import { cn } from '@/lib/utils'

const priorityConfig: Record<TicketPriority, { label: string; className: string }> = {
  critical: { label: 'Crítica',  className: 'bg-red-100 text-red-800' },
  high:     { label: 'Alta',     className: 'bg-orange-100 text-orange-800' },
  medium:   { label: 'Media',    className: 'bg-yellow-100 text-yellow-800' },
  low:      { label: 'Baja',     className: 'bg-gray-100 text-gray-700' },
}

const statusConfig: Record<TicketStatus, { label: string; className: string }> = {
  open:           { label: 'Abierto',          className: 'bg-blue-100 text-blue-800' },
  in_progress:    { label: 'En curso',          className: 'bg-indigo-100 text-indigo-800' },
  pending_client: { label: 'Esp. cliente',      className: 'bg-yellow-100 text-yellow-800' },
  resolved:       { label: 'Resuelto',          className: 'bg-green-100 text-green-800' },
  closed:         { label: 'Cerrado',           className: 'bg-gray-100 text-gray-600' },
}

const envConfig: Record<EbsEnv, { label: string; className: string }> = {
  production:  { label: 'Prod',    className: 'bg-red-50 text-red-700 border border-red-200' },
  development: { label: 'Dev',     className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  qa:          { label: 'QA',      className: 'bg-purple-50 text-purple-700 border border-purple-200' },
  uat:         { label: 'UAT',     className: 'bg-orange-50 text-orange-700 border border-orange-200' },
  staging:     { label: 'Staging', className: 'bg-gray-50 text-gray-700 border border-gray-200' },
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const cfg = priorityConfig[priority]
  return <span className={cn('badge', cfg.className)}>{cfg.label}</span>
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  const cfg = statusConfig[status]
  return <span className={cn('badge', cfg.className)}>{cfg.label}</span>
}

export function EnvBadge({ env, name }: { env: EbsEnv; name: string }) {
  const cfg = envConfig[env]
  return <span className={cn('badge', cfg.className)}>{name} ({cfg.label})</span>
}
