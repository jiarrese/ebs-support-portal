'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import type { BillingSummary, ProjectMonthlySummary } from '@/lib/types'

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6','#f97316','#a855f7']

function fmt(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

interface Props {
  billing: BillingSummary[]
  projects: ProjectMonthlySummary[]
}

export default function BillingCharts({ billing, projects }: Props) {
  const [view, setView] = useState<'company' | 'project'>('company')

  const companyData = billing.map(r => ({
    name: r.company_name,
    monto: r.total_amount,
    horas: r.total_hours,
  }))

  const projectData = projects.map(r => ({
    name: r.project_name,
    monto: r.total_amount,
    horas: r.used_hours,
    budget: r.budget_hours,
  }))

  const data = view === 'company' ? companyData : projectData
  if (data.length === 0) return null

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Resumen del período</h2>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          <button
            onClick={() => setView('company')}
            className={`px-3 py-1.5 transition-colors ${view === 'company' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Por empresa
          </button>
          <button
            onClick={() => setView('project')}
            className={`px-3 py-1.5 transition-colors ${view === 'project' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Por proyecto
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
          <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`]} />
          <Bar dataKey="monto" name="Monto" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Tabla proyectos con horas vs budget */}
      {view === 'project' && projectData.some(p => p.budget) && (
        <div className="mt-4 space-y-2">
          {projectData.filter(p => p.budget).map((p, i) => {
            const pct = Math.min((p.horas / p.budget!) * 100, 100)
            const over = p.horas > p.budget!
            return (
              <div key={i}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{p.name}</span>
                  <span className={over ? 'text-red-600 font-semibold' : ''}>
                    {p.horas.toFixed(1)}h / {p.budget}h {over && '⚠'}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${over ? 'bg-red-500' : pct > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
