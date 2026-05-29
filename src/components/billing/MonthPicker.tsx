'use client'

export default function MonthPicker({ currentMonth }: { currentMonth: string }) {
  return (
    <input
      type="month"
      defaultValue={currentMonth}
      className="input py-1.5 text-sm"
      onChange={e => { window.location.href = `/billing?month=${e.target.value}` }}
    />
  )
}
