'use client'

export function DateRangeFilter({ from, to }: { from?: string; to?: string }) {
  function navigate(key: 'from' | 'to', value: string) {
    const url = new URL(window.location.href)
    if (value) url.searchParams.set(key, value)
    else url.searchParams.delete(key)
    window.location.href = url.toString()
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-400">Desde</span>
      <input
        type="date"
        defaultValue={from ?? ''}
        className="input py-1.5 text-sm w-auto"
        onChange={e => navigate('from', e.target.value)}
      />
      <span className="text-xs text-gray-400">hasta</span>
      <input
        type="date"
        defaultValue={to ?? ''}
        className="input py-1.5 text-sm w-auto"
        onChange={e => navigate('to', e.target.value)}
      />
      {(from || to) && (
        <button
          onClick={() => {
            const url = new URL(window.location.href)
            url.searchParams.delete('from')
            url.searchParams.delete('to')
            window.location.href = url.toString()
          }}
          className="text-xs text-gray-400 hover:text-red-500 px-1"
          title="Limpiar fechas"
        >
          ✕
        </button>
      )}
    </div>
  )
}
