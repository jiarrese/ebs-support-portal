export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatHours(hours: number) {
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}:${String(m).padStart(2, '0')}hs`
}

export function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount)
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

// Para campos "date" puros (ej: entry_date, "YYYY-MM-DD"), sin componente de hora.
// new Date(dateStr) los interpreta como medianoche UTC, y en zonas UTC- (como
// Argentina) toLocaleDateString muestra el día anterior. Parseamos los
// componentes a mano para que se muestren tal cual están guardados.
export function formatDateOnly(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

export function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export const EBS_MODULES = [
  'GL', 'AP', 'AR', 'FA', 'CM', 'PO', 'INV', 'OM',
  'HR', 'PAY', 'OE', 'WIP', 'BOM', 'MRP', 'QA', 'Otro'
]
