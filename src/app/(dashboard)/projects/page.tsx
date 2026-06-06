import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatHours } from '@/lib/utils'
import type { BillingType } from '@/lib/types'

const BILLING_LABELS: Record<BillingType, string> = {
  hourly:        'Por hora',
  monthly_hours: 'Horas mensuales',
  fixed:         'Precio fijo',
}
const BILLING_COLORS: Record<BillingType, string> = {
  hourly:        'bg-blue-100 text-blue-700',
  monthly_hours: 'bg-purple-100 text-purple-700',
  fixed:         'bg-green-100 text-green-700',
}

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  if (profile?.role !== 'consultant') redirect('/tickets')

  const { data: projects } = await supabase
    .from('projects')
    .select('*, project_companies(company_id, companies(name))')
    .order('active', { ascending: false })
    .order('name')

  // Horas usadas este mes por proyecto
  const thisMonth = new Date().toISOString().slice(0, 7) + '-01'
  const { data: monthlyData } = await supabase
    .from('project_monthly_summary')
    .select('*')
    .gte('month', thisMonth)

  const usedByProject: Record<string, number> = {}
  ;(monthlyData ?? []).forEach((r: any) => { usedByProject[r.project_id] = r.used_hours })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Proyectos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projects?.length ?? 0} proyectos</p>
        </div>
        <Link href="/projects/new" className="btn-primary">+ Nuevo proyecto</Link>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {(projects ?? []).map((project: any) => {
          const used = usedByProject[project.id] ?? 0
          const budget = project.monthly_hours
          const pct = budget ? Math.min((used / budget) * 100, 100) : 0
          const over = budget && used > budget

          return (
            <div key={project.id} className={`card p-5 ${!project.active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="font-medium text-gray-900">{project.name}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BILLING_COLORS[project.billing_type as BillingType]}`}>
                      {BILLING_LABELS[project.billing_type as BillingType]}
                    </span>
                    {!project.active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactivo</span>
                    )}
                  </div>
                  {project.description && (
                    <p className="text-sm text-gray-500 mb-2">{project.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {(project.project_companies ?? []).map((pc: any) => (
                      <span key={pc.company_id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {pc.companies?.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  {project.billing_type === 'monthly_hours' && budget && (
                    <div className="text-right min-w-[120px]">
                      <p className="text-xs text-gray-400 mb-1">
                        Horas este mes: <span className={`font-medium ${over ? 'text-red-600' : 'text-gray-700'}`}>
                          {formatHours(used)} / {formatHours(budget)}
                        </span>
                      </p>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${over ? 'bg-red-500' : pct > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {project.hourly_rate && (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Tarifa</p>
                      <p className="font-semibold text-gray-800 text-sm">
                        {formatCurrency(project.hourly_rate, project.currency)}/h
                      </p>
                    </div>
                  )}
                  <Link href={`/projects/${project.id}`} className="btn-secondary py-1.5 text-xs">
                    Editar
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
        {(projects ?? []).length === 0 && (
          <div className="card p-12 text-center text-gray-400 text-sm">
            No hay proyectos.{' '}
            <Link href="/projects/new" className="text-indigo-600 hover:underline">Crear el primero</Link>
          </div>
        )}
      </div>
    </div>
  )
}
