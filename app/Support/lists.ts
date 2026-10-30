import { addDays } from './dates'

/** The fields of a to-do that decide which list it belongs in. */
export interface ListedTodo {
  id: number
  when: string
  start_date: string | null
  deadline: string | null
  completed_at: string | null
  canceled_at: string | null
  project_id?: number | null
  area_id?: number | null
}

export const SMART_LISTS = ['inbox', 'today', 'upcoming', 'anytime', 'someday', 'logbook'] as const
export type SmartList = (typeof SMART_LISTS)[number]

export function isSmartList(value: string): value is SmartList {
  return (SMART_LISTS as readonly string[]).includes(value)
}

const isOpen = (todo: ListedTodo): boolean => !todo.completed_at && !todo.canceled_at

/** Scheduled for a day that has not come yet, so it waits in Upcoming. */
const isScheduledLater = (todo: ListedTodo, today: string): boolean => !!todo.start_date && todo.start_date > today

/**
 * Which lists an open to-do appears in. Things' rules: Inbox holds what has no
 * home and no date yet; Today holds what you chose for today, what was
 * scheduled for a day that has arrived, and what is due; Upcoming holds what is
 * scheduled for later; Someday and Anytime are the unscheduled buckets.
 */
export function listsFor(todo: ListedTodo, today: string): SmartList[] {
  if (!isOpen(todo)) return ['logbook']
  const lists: SmartList[] = []
  if (isScheduledLater(todo, today)) return ['upcoming']
  const dueToday = !!todo.deadline && todo.deadline <= today
  const startedByNow = !!todo.start_date && todo.start_date <= today
  if (todo.when === 'inbox' && !todo.project_id && !todo.area_id && !startedByNow) lists.push('inbox')
  if (todo.when === 'today' || todo.when === 'evening' || startedByNow || dueToday) lists.push('today')
  if (todo.when === 'anytime' || (todo.when === 'inbox' && (todo.project_id || todo.area_id))) lists.push('anytime')
  if (todo.when === 'someday') lists.push('someday')
  return lists
}

export function inList<T extends ListedTodo>(todos: T[], list: SmartList, today: string): T[] {
  if (list === 'logbook')
    return todos.filter(todo => !isOpen(todo)).sort((a, b) => String(b.completed_at ?? b.canceled_at).localeCompare(String(a.completed_at ?? a.canceled_at)))
  const members = todos.filter(todo => listsFor(todo, today).includes(list))
  if (list === 'upcoming') return members.sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))
  return members
}

export function listCounts(todos: ListedTodo[], today: string): Record<Exclude<SmartList, 'logbook'>, number> & { evening: number, overdue: number } {
  const counts = { inbox: 0, today: 0, upcoming: 0, anytime: 0, someday: 0, evening: 0, overdue: 0 }
  for (const todo of todos) {
    for (const list of listsFor(todo, today)) if (list !== 'logbook') counts[list]++
    if (isOpen(todo) && todo.when === 'evening' && listsFor(todo, today).includes('today')) counts.evening++
    if (isOpen(todo) && todo.deadline && todo.deadline < today) counts.overdue++
  }
  return counts
}

/** Upcoming groups by day; the next seven days are listed one by one. */
export function upcomingHorizon(today: string): string {
  return addDays(today, 7)
}
