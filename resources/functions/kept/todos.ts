import { addDays } from '../../../app/Support/dates'
import { inList, listCounts, type ListedTodo, type SmartList } from '../../../app/Support/lists'
import type { ChecklistItem, Todo, When } from './types'

/** Which to-dos a pane shows: a smart list, or everything in a project or an area. */
export type View
  = | { kind: 'list', name: SmartList }
    | { kind: 'project', id: number }
    | { kind: 'area', id: number }

export const sameView = (a: View, b: View): boolean =>
  a.kind === b.kind && (a.kind === 'list' ? a.name === (b as typeof a).name : a.id === (b as { id: number }).id)

/** What the server hands back for a row of the generated CRUD routes is looser than a `Todo`; make it one. */
export function normalizeTodo(raw: Record<string, unknown>): Todo {
  let tags: string[] = []
  try {
    const value = typeof raw.tags === 'string' ? JSON.parse(raw.tags || '[]') : raw.tags
    if (Array.isArray(value)) tags = value.filter((tag): tag is string => typeof tag === 'string')
  }
  catch { tags = [] }
  return {
    ...(raw as unknown as Todo),
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    tags,
    checklist: Array.isArray(raw.checklist) ? (raw.checklist as Array<Record<string, unknown>>).map(normalizeItem).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id) : [],
  }
}

/** A checklist item as the server stores it (`done` is 0 or 1). */
export function normalizeItem(raw: Record<string, unknown>): ChecklistItem {
  return { ...(raw as unknown as ChecklistItem), done: Boolean(raw.done), title: String(raw.title ?? ''), sort_order: Number(raw.sort_order ?? 0) }
}

/** The generated routes want `tags` as a JSON string, not an array. */
export function serializeChanges(changes: Partial<Todo>): Record<string, unknown> {
  const body: Record<string, unknown> = { ...changes }
  delete body.checklist
  if (Array.isArray(changes.tags)) body.tags = JSON.stringify(changes.tags)
  return body
}

export const byOrder = <T extends { sort_order: number, id: number }>(a: T, b: T): number => a.sort_order - b.sort_order || a.id - b.id

const listed = (todo: Todo): ListedTodo => todo

/** Every open to-do that belongs to the view, in the order the user arranged them. */
export function viewItems(todos: Todo[], view: View, today: string): Todo[] {
  switch (view.kind) {
    case 'project': return todos.filter(todo => todo.project_id === view.id && !todo.completed_at && !todo.canceled_at).sort(byOrder)
    case 'area': return todos.filter(todo => todo.area_id === view.id && !todo.project_id && !todo.completed_at && !todo.canceled_at).sort(byOrder)
    case 'list':
      if (view.name === 'logbook') return inList(todos.map(listed), 'logbook', today) as Todo[]
      if (view.name === 'upcoming') return (inList(todos.map(listed), 'upcoming', today) as Todo[]).sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)) || byOrder(a, b))
      return (inList(todos.map(listed), view.name, today) as Todo[]).sort(byOrder)
  }
}

/** Today's two halves: the main list and "This Evening". */
export function splitToday(items: Todo[]): { main: Todo[], evening: Todo[] } {
  return { main: items.filter(todo => todo.when !== 'evening'), evening: items.filter(todo => todo.when === 'evening') }
}

export function counts(todos: Todo[], today: string): ReturnType<typeof listCounts> {
  return listCounts(todos.map(listed), today)
}

/** Open and finished to-dos in a project, for the progress ring. */
export function progress(open: number, done: number): number {
  const total = open + done
  return total === 0 ? 0 : done / total
}

/** What a new to-do gets when it is added from the open view (Things puts it in the list you are looking at). */
export function newTodoFor(view: View, today: string): Partial<Todo> | null {
  switch (view.kind) {
    case 'project': return { project_id: view.id, when: 'anytime' }
    case 'area': return { area_id: view.id, when: 'anytime' }
    case 'list':
      switch (view.name) {
        case 'inbox': return { when: 'inbox' }
        case 'today': return { when: 'today' }
        case 'upcoming': return { when: 'anytime', start_date: addDays(today, 1) }
        case 'anytime': return { when: 'anytime' }
        case 'someday': return { when: 'someday' }
        case 'logbook': return null
      }
  }
}

/** The When picker's choices: a named bucket or a date. */
export type WhenChoice = Exclude<When, 'inbox'> | { date: string }

export function whenPatch(choice: WhenChoice): Partial<Todo> {
  if (typeof choice === 'object') return { when: 'anytime', start_date: choice.date }
  return { when: choice, start_date: null }
}

/** How the to-do currently reads in the picker. */
export function whenLabel(todo: Pick<Todo, 'when' | 'start_date'>, today: string): string {
  if (todo.start_date && todo.start_date > today) return 'Scheduled'
  switch (todo.when) {
    case 'today': return 'Today'
    case 'evening': return 'This Evening'
    case 'anytime': return todo.start_date && todo.start_date <= today ? 'Today' : 'Anytime'
    case 'someday': return 'Someday'
    default: return todo.start_date && todo.start_date <= today ? 'Today' : 'Inbox'
  }
}

/** Move `id` to sit at `index` in `ids`. */
export function moveId(ids: number[], id: number, index: number): number[] {
  const from = ids.indexOf(id)
  if (from < 0) return ids
  const next = ids.filter(other => other !== id)
  next.splice(Math.max(0, Math.min(index, next.length)), 0, id)
  return next
}

/** The sort orders that change when the list is rearranged into `order`; unchanged rows are not written. */
export function orderChanges(items: Array<{ id: number, sort_order: number }>, order: number[]): Array<{ id: number, sort_order: number }> {
  const current = new Map(items.map(item => [item.id, item.sort_order]))
  const changes: Array<{ id: number, sort_order: number }> = []
  order.forEach((id, index) => {
    const wanted = index + 1
    if (current.has(id) && current.get(id) !== wanted) changes.push({ id, sort_order: wanted })
  })
  return changes
}

/** The tag in `text`, split on commas, trimmed, with duplicates and empties dropped. */
export function parseTagInput(text: string, existing: string[] = []): string[] {
  const seen = new Set(existing.map(tag => tag.toLowerCase()))
  const next = [...existing]
  for (const raw of text.split(',')) {
    const tag = raw.trim().replace(/^#/, '').slice(0, 40)
    if (tag && !seen.has(tag.toLowerCase())) { seen.add(tag.toLowerCase()); next.push(tag) }
  }
  return next
}

export function allTags(todos: Todo[]): string[] {
  return [...new Set(todos.flatMap(todo => todo.tags))].sort((a, b) => a.localeCompare(b))
}

export interface LogGroup { key: string, label: string, items: Todo[] }

/** The Logbook groups finished to-dos by the (local) day they were finished. `completed` is an ISO timestamp from the server. */
export function groupLogbook(items: Todo[], today: string, dayOf: (iso: string) => string, label: (day: string, today: string) => string): LogGroup[] {
  const groups = new Map<string, LogGroup>()
  for (const todo of items) {
    const at = todo.completed_at ?? todo.canceled_at
    if (!at) continue
    const day = dayOf(at)
    if (!groups.has(day)) groups.set(day, { key: day, label: label(day, today), items: [] })
    groups.get(day)!.items.push(todo)
  }
  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key))
}
