'use client'

export function FilterSelect({
  name, label, current, options
}: {
  name: string
  label: string
  current?: string
  options: { value: string; label: string }[]
}) {
  return (
    <form>
      <select
        name={name}
        defaultValue={current ?? ''}
        onChange={e => {
          const url = new URL(window.location.href)
          if (e.target.value) url.searchParams.set(name, e.target.value)
          else url.searchParams.delete(name)
          window.location.href = url.toString()
        }}
        className="input py-1.5 text-sm w-auto pr-8"
      >
        <option value="">{label}: Todos</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </form>
  )
}
