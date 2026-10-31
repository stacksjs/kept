import { addDays } from '../../../app/Support/dates'

/** Dates in Library are `YYYY-MM-DD` strings, so all of this is plain calendar arithmetic with no time zone in it. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function parts(day: string): { y: number, m: number, d: number, weekday: number } {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }
}

/** Whole days from `a` to `b` (positive when `b` is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5)
}

/** `Nov 4`, or `Nov 4, 2027` when it is not this year. */
export function shortDate(day: string, today: string): string {
  const { y, m, d } = parts(day)
  return `${MONTHS[m - 1]} ${d}${y === parts(today).y ? '' : `, ${y}`}`
}

/** `Today`, `Tomorrow`, `Yesterday`, a weekday inside the week, else a short date. */
export function dayLabel(day: string, today: string): string {
  const diff = daysBetween(today, day)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 1 && diff < 7) return WEEKDAYS[parts(day).weekday]!
  return `${WEEKDAYS[parts(day).weekday]!.slice(0, 3)}, ${shortDate(day, today)}`
}

export type DeadlineState = 'overdue' | 'today' | 'soon' | 'later'

export function deadlineState(deadline: string, today: string): DeadlineState {
  const diff = daysBetween(today, deadline)
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  return diff <= 3 ? 'soon' : 'later'
}

/** What the deadline chip says: `2 days overdue`, `Due today`, `Due in 3 days`, `Due Nov 20`. */
export function deadlineLabel(deadline: string, today: string): string {
  const diff = daysBetween(today, deadline)
  if (diff < 0) return `${-diff} ${-diff === 1 ? 'day' : 'days'} overdue`
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  if (diff <= 7) return `Due in ${diff} days`
  return `Due ${shortDate(deadline, today)}`
}

export interface DayGroup<T> { key: string, label: string, sub: string, items: T[] }

/**
 * Upcoming groups the next week day by day and everything after by month,
 * the way Things lays out its calendar list.
 */
export function groupByDay<T extends { start_date: string | null }>(items: T[], today: string): Array<DayGroup<T>> {
  const groups = new Map<string, DayGroup<T>>()
  const horizon = addDays(today, 7)
  for (const item of items) {
    const day = item.start_date
    if (!day) continue
    const month = day.slice(0, 7)
    const key = day < horizon ? day : month
    let group = groups.get(key)
    if (!group) {
      const { y, m, d } = parts(day)
      group = day < horizon
        ? { key, label: dayLabel(day, today), sub: `${MONTHS[m - 1]} ${d}`, items: [] }
        : { key, label: `${MONTHS_LONG[m - 1]}${y === parts(today).y ? '' : ` ${y}`}`, sub: '', items: [] }
      groups.set(key, group)
    }
    group.items.push(item)
  }
  // A month sorts after every day of the week that precedes it ('2026-11' alone would sort before '2026-11-03').
  const order = (key: string): string => (key.length === 7 ? `${key}-99` : key)
  return [...groups.values()].sort((a, b) => order(a.key).localeCompare(order(b.key)))
}

export interface DayBlock<T> { key: string, label: string, /** The day of the month, drawn large; empty for a month block. */ number: string, items: T[] }

/**
 * Upcoming shows the next week day by day, empty days included (Things keeps
 * every day of the week as a block), and everything after by month.
 */
export function groupUpcoming<T extends { start_date: string | null }>(items: T[], today: string): Array<DayBlock<T>> {
  const groups = new Map<string, DayBlock<T>>()
  const horizon = addDays(today, 7)
  for (let step = 1; step < 7; step++) {
    const day = addDays(today, step)
    groups.set(day, { key: day, label: dayLabel(day, today), number: String(parts(day).d), items: [] })
  }
  for (const item of items) {
    const day = item.start_date
    if (!day || day <= today) continue
    const key = day < horizon ? day : day.slice(0, 7)
    let group = groups.get(key)
    if (!group) {
      const { y, m } = parts(day)
      group = { key, label: `${MONTHS_LONG[m - 1]}${y === parts(today).y ? '' : ` ${y}`}`, number: '', items: [] }
      groups.set(key, group)
    }
    group.items.push(item)
  }
  // A month sorts after every day of the week that precedes it ('2026-11' alone would sort before '2026-11-03').
  const order = (key: string): string => (key.length === 7 ? `${key}-99` : key)
  return [...groups.values()].sort((a, b) => order(a.key).localeCompare(order(b.key)))
}

/**
 * The date on a note in the list, the way Notes.app writes it: a time today,
 * `Yesterday`, a weekday inside the week, otherwise the date.
 */
export function noteDate(iso: string, now: Date = new Date()): string {
  const when = new Date(iso)
  if (Number.isNaN(when.getTime())) return ''
  const local = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const today = local(now)
  const day = local(when)
  const diff = daysBetween(day, today)
  if (diff === 0) return when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (diff === 1) return 'Yesterday'
  if (diff > 1 && diff < 7) return WEEKDAYS[when.getDay()]!
  return shortDate(day, today)
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}

/** A person's initials, for an avatar disc. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1]![0]! : '')).toUpperCase() || '?'
}

/** The local calendar day (`YYYY-MM-DD`) of an ISO timestamp. */
export function localDay(iso: string): string {
  const when = new Date(iso)
  if (Number.isNaN(when.getTime())) return ''
  return `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}`
}
