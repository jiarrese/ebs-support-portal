import Link from 'next/link'
import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react'

export type SortDir = 'asc' | 'desc'

interface Props {
  field: string
  label: string
  sort: string
  dir: SortDir
  searchParams: Record<string, string | undefined>
  align?: 'left' | 'right'
}

export function SortableHeader({ field, label, sort, dir, searchParams, align = 'left' }: Props) {
  const active = sort === field
  const nextDir: SortDir = active && dir === 'asc' ? 'desc' : 'asc'

  const params = new URLSearchParams()
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value && key !== 'sort' && key !== 'dir') params.set(key, value)
  })
  params.set('sort', field)
  params.set('dir', nextDir)

  return (
    <Link
      href={`?${params.toString()}`}
      className={`inline-flex items-center gap-1 hover:text-gray-700 transition-colors ${align === 'right' ? 'flex-row-reverse' : ''}`}
    >
      {label}
      {active
        ? (dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)
        : <ChevronsUpDown className="w-3 h-3 text-gray-300" />}
    </Link>
  )
}
