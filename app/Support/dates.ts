/** Calendar dates in Kept are `YYYY-MM-DD` strings, so they never move with a time zone. */
const DAY = /^\d{4}-\d{2}-\d{2}$/

export function isDay(value: unknown): value is string {
  if (typeof value !== 'string' || !DAY.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** The device's `today` when it sent a real date, otherwise the server's UTC date. */
export function dayOrToday(value: unknown): string {
  return isDay(value) ? value : new Date().toISOString().slice(0, 10)
}

export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function addMonths(day: string, months: number): string {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number]
  const target = new Date(Date.UTC(year, month - 1 + months, 1))
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(date, last))
  return target.toISOString().slice(0, 10)
}

export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

/** The next date a repeating to-do comes back, counted from `from`. Month ends clamp (Jan 31 -> Feb 28). */
export function nextOccurrence(from: string, repeat: Repeat): string | null {
  switch (repeat) {
    case 'daily': return addDays(from, 1)
    case 'weekly': return addDays(from, 7)
    case 'monthly': return addMonths(from, 1)
    case 'yearly': return addMonths(from, 12)
    default: return null
  }
}
