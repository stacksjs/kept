/**
 * The Mac app's pure logic: what the sidebar lists, which pane a sidebar row
 * opens, what a new to-do gets from the list it is typed into, how a list is
 * grouped and what each row's chips say, prompt variables, note check lines,
 * and the offline cache's keys and limits. Nothing here touches Craft, so all
 * of it runs under `bun test`; `native-kept.ts` is the part that does.
 */
import { addDays } from '../../../app/Support/dates'
import type { SmartList } from '../../../app/Support/lists'
import { deadlineLabel, deadlineState, groupByDay, shortDate } from './format'
import { publicLinkUrl } from './promptview'
import { newTodoFor, splitToday, viewItems, type View } from './todos'
import type { Library, LibraryList, SidebarData, Todo } from './types'

// Navigation

export type Nav
  = | { section: 'todos', view: View }
    | { section: 'notes', folder: 'all' | number }
    | { section: 'prompts', library: number }

export const SMART_LISTS: Array<{ name: SmartList, label: string, icon: string, color: string, shortcut: string }> = [
  { name: 'inbox', label: 'Inbox', icon: 'tray', color: '#1a7cf5', shortcut: 'cmd+1' },
  { name: 'today', label: 'Today', icon: 'star.fill', color: '#f2b600', shortcut: 'cmd+2' },
  { name: 'upcoming', label: 'Upcoming', icon: 'calendar', color: '#e5484d', shortcut: 'cmd+3' },
  { name: 'anytime', label: 'Anytime', icon: 'square.stack', color: '#12a594', shortcut: 'cmd+4' },
  { name: 'someday', label: 'Someday', icon: 'archivebox', color: '#b58a1b', shortcut: 'cmd+5' },
  { name: 'logbook', label: 'Logbook', icon: 'checkmark.square', color: '#2f9e44', shortcut: 'cmd+6' },
]

/** The sidebar row id for a pane. */
export function navId(nav: Nav): string {
  if (nav.section === 'notes') return nav.folder === 'all' ? 'notes:all' : `folder:${nav.folder}`
  if (nav.section === 'prompts') return `library:${nav.library}`
  const view = nav.view
  return view.kind === 'list' ? `list:${view.name}` : `${view.kind}:${view.id}`
}

/** The pane a sidebar row opens, or null for an id that names nothing. */
export function parseNav(id: string): Nav | null {
  const [kind = '', rest = ''] = id.split(':')
  const number = Number(rest)
  if (kind === 'list') return SMART_LISTS.some(list => list.name === rest) ? { section: 'todos', view: { kind: 'list', name: rest as SmartList } } : null
  if (kind === 'notes' && rest === 'all') return { section: 'notes', folder: 'all' }
  if (!Number.isInteger(number) || number <= 0) return null
  if (kind === 'project' || kind === 'area') return { section: 'todos', view: { kind, id: number } }
  if (kind === 'folder') return { section: 'notes', folder: number }
  if (kind === 'library') return { section: 'prompts', library: number }
  return null
}

export interface SidebarItem { id: string, label: string, icon: string, color?: string, badge: string }
export interface SidebarSection { id: string, header?: string, items: SidebarItem[] }

const badge = (count: number | undefined): string => (count ? String(count) : '')

/**
 * The outline Things and Notes users expect: the smart lists with their
 * counts, areas with their projects, note folders, prompt libraries, and the
 * libraries other people shared. Empty groups are left out.
 */
export function sidebarSections(data: SidebarData | null, libraries: LibraryList | null, counts?: Partial<SidebarData['lists']>): SidebarSection[] {
  const lists = { ...data?.lists, ...counts }
  const shown: Partial<Record<SmartList, number>> = { inbox: lists.inbox, today: lists.today }
  const sections: SidebarSection[] = [{
    id: 'lists',
    items: SMART_LISTS.map(list => ({ id: `list:${list.name}`, label: list.label, icon: list.icon, color: list.color, badge: badge(shown[list.name]) })),
  }]

  const projects = data?.projects ?? []
  const areas = data?.areas ?? []
  const project = (p: SidebarData['projects'][number]): SidebarItem => ({ id: `project:${p.id}`, label: p.title, icon: 'circle.dashed', color: '#1a7cf5', badge: badge(p.open) })
  const places: SidebarItem[] = projects.filter(p => !p.area_id || !areas.some(a => a.id === p.area_id)).map(project)
  for (const area of areas) {
    places.push({ id: `area:${area.id}`, label: area.title, icon: 'square.stack.3d.up', color: '#7c7c80', badge: '' })
    places.push(...projects.filter(p => p.area_id === area.id).map(project))
  }
  if (places.length) sections.push({ id: 'areas', header: 'Areas', items: places })

  sections.push({
    id: 'notes',
    header: 'Notes',
    items: [
      { id: 'notes:all', label: 'All Notes', icon: 'note.text', color: '#e8a10c', badge: badge(data?.notes) },
      ...(data?.note_folders ?? []).map(folder => ({ id: `folder:${folder.id}`, label: folder.title, icon: 'folder', color: '#e8a10c', badge: badge(folder.notes) })),
    ],
  })

  const library = (lib: Library, icon: string): SidebarItem => ({ id: `library:${lib.id}`, label: lib.title, icon, color: libraryColor(lib.color), badge: badge(lib.prompts) })
  const owned = libraries?.owned ?? data?.libraries ?? []
  if (owned.length) sections.push({ id: 'libraries', header: 'Prompt Libraries', items: owned.map(lib => library(lib, 'text.book.closed')) })
  const shared = libraries?.shared ?? []
  if (shared.length) sections.push({ id: 'shared', header: 'Shared with me', items: shared.map(lib => ({ ...library(lib, 'person.2'), badge: lib.role === 'editor' ? 'Editor' : 'Viewer' })) })
  return sections
}

/** Library colours are hex; anything else (an old or empty value) falls back to the accent blue. */
export function libraryColor(color: string | undefined): string {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : '#1a7cf5'
}

/** Find a library in either half of the list, with whether this person may change it. */
export function findLibrary(libraries: LibraryList | null, id: number): { library: Library, owned: boolean, canEdit: boolean } | null {
  const owned = libraries?.owned.find(lib => lib.id === id)
  if (owned) return { library: owned, owned: true, canEdit: true }
  const shared = libraries?.shared.find(lib => lib.id === id)
  if (shared) return { library: shared, owned: false, canEdit: shared.role === 'editor' }
  return null
}

/** The heading over the middle pane. */
export function navTitle(nav: Nav, data: SidebarData | null, libraries: LibraryList | null): string {
  if (nav.section === 'notes') return nav.folder === 'all' ? 'All Notes' : data?.note_folders.find(f => f.id === nav.folder)?.title ?? 'Folder'
  if (nav.section === 'prompts') return findLibrary(libraries, nav.library)?.library.title ?? 'Prompt Library'
  const view = nav.view
  if (view.kind === 'list') return SMART_LISTS.find(list => list.name === view.name)?.label ?? 'To-Dos'
  if (view.kind === 'project') return data?.projects.find(p => p.id === view.id)?.title ?? 'Project'
  return data?.areas.find(a => a.id === view.id)?.title ?? 'Area'
}

// To-dos

/** What the quick-entry row creates in the open list, or null where nothing can be added (the Logbook). */
export function quickEntry(view: View, title: string, today: string): Partial<Todo> | null {
  const name = title.trim()
  const base = newTodoFor(view, today)
  if (!name || !base) return null
  return { ...base, title: name.slice(0, 255) }
}

export interface TodoGroup { key: string, label: string, sub: string, items: Todo[] }

/** A list's rows in the sections it shows: Today's evening, Upcoming's days, one plain group otherwise. */
export function todoGroups(view: View, open: Todo[], logbook: Todo[], today: string, search = ''): TodoGroup[] {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean)
  const match = (todo: Todo): boolean => !words.length || words.every(word => `${todo.title}\n${todo.notes}\n${todo.tags.join(' ')}`.toLowerCase().includes(word))
  const isLog = view.kind === 'list' && view.name === 'logbook'
  const items = viewItems(isLog ? [...open, ...logbook] : open, view, today).filter(match)
  if (view.kind === 'list' && view.name === 'today') {
    const { main, evening } = splitToday(items)
    const groups: TodoGroup[] = [{ key: 'today', label: '', sub: '', items: main }]
    if (evening.length) groups.push({ key: 'evening', label: 'This Evening', sub: '', items: evening })
    return groups
  }
  if (view.kind === 'list' && view.name === 'upcoming')
    return groupByDay(items, today).map(group => ({ key: group.key, label: group.label, sub: group.sub, items: group.items }))
  return [{ key: 'all', label: '', sub: '', items }]
}

export type ChipTone = 'when' | 'overdue' | 'due' | 'deadline' | 'tag' | 'check' | 'repeat' | 'project'
export interface Chip { text: string, tone: ChipTone, symbol: string }

/** The small labels after a to-do's title, in the order Things shows them. */
export function todoChips(todo: Todo, view: View, today: string, projectTitle?: (id: number) => string | undefined): Chip[] {
  const chips: Chip[] = []
  const list = view.kind === 'list' ? view.name : null
  if (todo.project_id && view.kind !== 'project') {
    const title = projectTitle?.(todo.project_id)
    if (title) chips.push({ text: title, tone: 'project', symbol: 'circle.dashed' })
  }
  if (!todo.completed_at) {
    if (todo.start_date && todo.start_date > today) {
      if (list !== 'upcoming') chips.push({ text: shortDate(todo.start_date, today), tone: 'when', symbol: 'calendar' })
    }
    else if (list !== 'today' && (todo.when === 'today' || todo.when === 'evening' || (todo.start_date && todo.start_date <= today))) {
      chips.push({ text: todo.when === 'evening' ? 'This Evening' : 'Today', tone: 'when', symbol: todo.when === 'evening' ? 'moon.fill' : 'star.fill' })
    }
    else if (todo.when === 'someday' && list !== 'someday') {
      chips.push({ text: 'Someday', tone: 'when', symbol: 'archivebox' })
    }
  }
  if (todo.deadline && !todo.completed_at) {
    const state = deadlineState(todo.deadline, today)
    chips.push({ text: deadlineLabel(todo.deadline, today), tone: state === 'overdue' ? 'overdue' : state === 'later' ? 'deadline' : 'due', symbol: 'flag.fill' })
  }
  if (todo.repeat && todo.repeat !== 'none') chips.push({ text: todo.repeat[0]!.toUpperCase() + todo.repeat.slice(1), tone: 'repeat', symbol: 'repeat' })
  if (todo.checklist.length) chips.push({ text: `${todo.checklist.filter(item => item.done).length}/${todo.checklist.length}`, tone: 'check', symbol: 'checklist' })
  for (const tag of todo.tags) chips.push({ text: tag, tone: 'tag', symbol: '' })
  return chips
}

/** A chip's text and fill on a light or dark surface; every pair keeps 4.5:1 contrast. */
export function chipColors(tone: ChipTone, dark: boolean): { fg: string, bg: string } {
  switch (tone) {
    case 'overdue': return dark ? { fg: '#ff8a8a', bg: '#3a1d1f' } : { fg: '#b4232a', bg: '#fde8e8' }
    case 'due': return dark ? { fg: '#ffb86b', bg: '#3a2a17' } : { fg: '#9a4a00', bg: '#fdf0e1' }
    case 'when': return dark ? { fg: '#f5cf4a', bg: '#33301d' } : { fg: '#7a5a00', bg: '#fbf3d5' }
    case 'tag': return dark ? { fg: '#c7c7cc', bg: '#3a3a3c' } : { fg: '#48484a', bg: '#ececee' }
    case 'project': return dark ? { fg: '#8cb8ff', bg: '#1d2a3d' } : { fg: '#1652b8', bg: '#e6efff' }
    default: return dark ? { fg: '#aeaeb2', bg: 'transparent' } : { fg: '#6e6e73', bg: 'transparent' }
  }
}

export const REPEATS = [
  { value: 'none', label: 'Never' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
  { value: 'yearly', label: 'Every year' },
]

export const WHEN_CHOICES = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'today', label: 'Today' },
  { value: 'evening', label: 'This Evening' },
  { value: 'anytime', label: 'Anytime' },
  { value: 'someday', label: 'Someday' },
]

/** A real `YYYY-MM-DD` calendar day. */
export function isDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** What a typed date field means: a day, cleared, or not finished being typed yet. */
export function parseDayField(text: string): { ok: true, value: string | null } | { ok: false } {
  const value = text.trim()
  if (!value) return { ok: true, value: null }
  if (/^tomorrow$/i.test(value)) return { ok: true, value: 'tomorrow' }
  return isDay(value) ? { ok: true, value } : { ok: false }
}

/** `tomorrow` typed into a date field, made a date. */
export function resolveDay(value: string | null, today: string): string | null {
  return value === 'tomorrow' ? addDays(today, 1) : value
}

// Prompts

/** A new prompt starts with one variable so the Use sheet has something to show. Kept here: stx reads braces in a screen script as a template. */
export const NEW_PROMPT_BODY = 'Write about {{topic}}.'

const VARIABLE = /\{\{\s*([A-Za-z_][\w.-]*)\s*\}\}/g

/** The `{{variables}}` in a prompt body, each once, in the order they first appear. */
export function promptVariables(body: string): string[] {
  const names: string[] = []
  VARIABLE.lastIndex = 0
  let match = VARIABLE.exec(body)
  while (match) {
    if (!names.includes(match[1]!)) names.push(match[1]!)
    match = VARIABLE.exec(body)
  }
  return names
}

/** The body with every filled variable replaced; ones left empty keep their `{{placeholder}}`. */
export function fillPrompt(body: string, values: Record<string, string>): string {
  return body.replace(VARIABLE, (whole, name: string) => (values[name] ? values[name]! : whole))
}

/** How many variables still have nothing typed for them. */
export function unfilled(body: string, values: Record<string, string>): string[] {
  return promptVariables(body).filter(name => !values[name]?.trim())
}

/** The read-only link a library's public token opens: the web app's `/p/<token>`, from the app's origin. */
export function shareLink(origin: string, token: string): string {
  return publicLinkUrl(origin, token)
}

// Notes

const CHECK_LINE = /^(\s*)[-*+]\s+\[([ xX])\]\s?(.*)$/

export interface CheckLine { line: number, text: string, done: boolean }

/** The note's `- [ ]` lines, for the checklist strip under the editor. */
export function checkLines(body: string): CheckLine[] {
  const lines: CheckLine[] = []
  body.split('\n').forEach((text, line) => {
    const match = CHECK_LINE.exec(text)
    if (match) lines.push({ line, text: match[3] ?? '', done: match[2] !== ' ' })
  })
  return lines
}

/**
 * The Toggle Checklist command, with no caret to go by: the last line that has
 * text becomes a `- [ ]` line, or stops being one. An empty note gets a fresh
 * check line to type into.
 */
export function toggleChecklist(body: string): string {
  const lines = body.split('\n')
  let index = lines.length - 1
  while (index > 0 && !lines[index]!.trim()) index--
  const line = lines[index] ?? ''
  const check = CHECK_LINE.exec(line)
  if (check) lines[index] = `${check[1]}${check[3]}`
  else if (/^\s*[-*+]\s+/.test(line)) lines[index] = line.replace(/^(\s*)[-*+]\s+/, '$1- [ ] ')
  else lines[index] = line.trim() ? `- [ ] ${line}` : '- [ ] '
  return lines.join('\n')
}

/** Add an empty check line at the end, the way the toolbar's checklist button does in Notes. */
export function appendCheckLine(body: string): string {
  if (!body.trim()) return '- [ ] '
  return `${body.replace(/\n+$/, '')}\n- [ ] `
}

/** A note's date in the list: a time today, else a short date. Avoids Intl, which the script engine may lack. */
export function noteStamp(iso: string, now: Date = new Date()): string {
  const when = new Date(iso)
  if (Number.isNaN(when.getTime())) return ''
  const day = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  if (day(when) === day(now)) {
    const hours = when.getHours()
    return `${hours % 12 || 12}:${String(when.getMinutes()).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`
  }
  return shortDate(day(when), day(now))
}

// Offline cache

export type CacheName = 'sidebar' | 'libraries' | 'todos' | 'notes' | `prompts.${number}`

/** Saved data is per account, so a second person signing in on the Mac never sees the first one's lists. */
export function cacheKey(account: number | string, name: CacheName): string {
  return `kept.cache.${account}.${name}`
}

/** The most rows of each kind the cache keeps; UserDefaults is not a database. */
export const CACHE_LIMITS = { todos: 600, logbook: 200, notes: 300, prompts: 300 } as const

/** Trim what is about to be saved so a huge account cannot bloat the preferences file. */
export function capForCache<T>(name: CacheName, value: T): T {
  if (name === 'todos') {
    const todos = value as unknown as { open: unknown[], logbook: unknown[] }
    return { ...todos, open: todos.open.slice(0, CACHE_LIMITS.todos), logbook: todos.logbook.slice(0, CACHE_LIMITS.logbook) } as T
  }
  if (name === 'notes' && Array.isArray(value)) return value.slice(0, CACHE_LIMITS.notes) as T
  if (name.startsWith('prompts.')) {
    const prompts = value as unknown as { prompts?: unknown[] }
    if (Array.isArray(prompts?.prompts)) return { ...prompts, prompts: prompts.prompts.slice(0, CACHE_LIMITS.prompts) } as T
  }
  return value
}

/** A failure that means the server could not be reached (no HTTP status), not that it said no. */
export function isOfflineError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  if (typeof (error as { status?: unknown }).status === 'number') return false
  const text = `${(error as { name?: string }).name ?? ''} ${(error as { code?: string }).code ?? ''} ${(error as { message?: string }).message ?? ''}`
  return /network|offline|connect|timed? ?out|unreachable|internet|TypeError/i.test(text)
}

/** The text of a native input event, whichever shape the host sent. */
export function eventText(event: unknown): string {
  if (typeof event === 'string') return event
  const e = event as { nativeEvent?: { text?: unknown, value?: unknown }, text?: unknown, value?: unknown } | null
  const value = e?.nativeEvent?.text ?? e?.nativeEvent?.value ?? e?.text ?? e?.value
  return typeof value === 'string' ? value : ''
}

/** The value of a native picker, switch or sidebar event. */
export function eventValue(event: unknown): unknown {
  const e = event as { nativeEvent?: { value?: unknown }, value?: unknown } | null
  return e?.nativeEvent?.value ?? e?.value ?? event
}
