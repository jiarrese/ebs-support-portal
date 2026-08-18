'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function parseMultiFilter(value?: string): string[] {
  return value ? value.split(',').filter(Boolean) : []
}

export function FilterSelect({
  name, label, current, options
}: {
  name: string
  label: string
  current?: string
  options: { value: string; label: string }[]
}) {
  const currentValues = parseMultiFilter(current)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>(currentValues)

  // Si la URL cambia por otra vía (ej. otro filtro navegó), resincronizar.
  useEffect(() => { setSelected(currentValues) }, [current]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(value: string) {
    setSelected(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
  }

  function close() {
    setOpen(false)
    const changed = selected.length !== currentValues.length || selected.some(v => !currentValues.includes(v))
    if (!changed) return
    const url = new URL(window.location.href)
    if (selected.length > 0) url.searchParams.set(name, selected.join(','))
    else url.searchParams.delete(name)
    window.location.href = url.toString()
  }

  const summary = selected.length === 0
    ? `${label}: Todos`
    : selected.length === 1
      ? `${label}: ${options.find(o => o.value === selected[0])?.label ?? selected[0]}`
      : `${label}: ${selected.length} seleccionados`

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="input py-1.5 text-sm w-auto pr-2 text-left flex items-center gap-1.5"
      >
        {summary}
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[190px] max-h-64 overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelected([])}
              className="w-full text-left px-3 py-1.5 text-xs text-indigo-600 hover:bg-gray-50 border-b border-gray-100 mb-1"
            >
              Todos
            </button>
            {options.map(o => (
              <label
                key={o.value}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(o.value)}
                  onChange={() => toggle(o.value)}
                  className="rounded border-gray-300 text-indigo-600 flex-shrink-0"
                />
                <span className="truncate">{o.label}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
