'use client'

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6','#f97316','#a855f7']

interface Entry {
  hours: number
  entry_date: string
  tickets: {
    companies: { name: string } | null
    projects: { name: string } | null
  } | null
}

interface Props {
  entries: Entry[]
}

function formatMonth(m: string) {
  const [y, mo] = m.split('-')
  return new Date(parseInt(y), parseInt(mo) - 1, 1)
    .toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
}

export default function HoursCharts({ entries }: Props) {
  const [groupBy, setGroupBy] = useState<'company' | 'project'>('company')

  const { chartData, keys } = useMemo(() => {
    const byMonth: Record<string, Record<string, number>> = {}

    entries.forEach(e => {
      const month = e.entry_date.slice(0, 7)
      const key = groupBy === 'company'
        ? (e.tickets?.companies?.name ?? 'Sin empresa')
        : (e.tickets?.projects?.name ?? 'Sin proyecto')

      if (!byMonth[month]) byMonth[month] = {}
      byMonth[month][key] = (byMonth[month][key] ?? 0) + e.hours
    })

    const allKeys = Array.from(new Set(entries.map(e =>
      groupBy === 'company'
        ? (e.tickets?.companies?.name ?? 'Sin empresa')
        : (e.tickets?.projects?.name ?? 'Sin proyecto')
    ))).sort()

    const chartData = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month: formatMonth(month), ...data }))

    return { chartData, keys: allKeys }
  }, [entries, groupBy])

  if (entries.length === 0) return null

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Horas por período</h2>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          <button
            onClick={() => setGroupBy('company')}
            className={`px-3 py-1.5 transition-colors ${groupBy === 'company' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Por empresa
          </button>
          <button
            onClick={() => setGroupBy('project')}
            className={`px-3 py-1.5 transition-colors ${groupBy === 'project' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Por proyecto
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit="h" />
          <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}h`]} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {keys.map((key, i) => (
            <Bar key={key} dataKey={key} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === keys.length - 1 ? [3, 3, 0, 0] : [0,0,0,0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
