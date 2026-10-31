/**
 * The Mac app's pure logic: what the sidebar lists, which pane a sidebar row
 * opens, what a new to-do gets from the list it is typed into, how a list is
 * laid out in blocks (Things: Today and This Evening, Upcoming's days, the
 * projects in Anytime), what each row shows, how Notes groups its list by
 * date, prompt variables, note check lines and formatting, inline completion
 * text, and the offline cache's keys and limits. Nothing here touches Craft,
 * so all of it runs under `bun test`; `native-kept.ts` is the part that does.
 */
import { addDays } from '../../../app/Support/dates'
import type { SmartList } from '../../../app/Support/lists'
import { daysBetween, deadlineLabel, deadlineState, groupUpcoming, shortDate } from './format'
import { applyFormat, type Format } from './markdown'
import { publicLinkUrl } from './promptview'
import { byOrder, newTodoFor, splitToday, viewItems, type View } from './todos'
import type { Library, LibraryList, Note, NoteFolder, Project, SidebarData, Todo } from './types'

// Navigation

export type NoteFolderKey = 'all' | 'trash' | number | `tag:${string}`

export type Nav
  = | { section: 'todos', view: View }
    | { section: 'notes', folder: NoteFolderKey }
    | { section: 'prompts', library: number }

export const SMART_LISTS: Array<{ name: SmartList, label: string, icon: string, color: string, shortcut: string }> = [
  { name: 'inbox', label: 'Inbox', icon: 'tray.fill', color: '#1a8cff', shortcut: 'cmd+1' },
  { name: 'today', label: 'Today', icon: 'star.fill', color: '#f7c600', shortcut: 'cmd+2' },
  { name: 'upcoming', label: 'Upcoming', icon: 'calendar', color: '#f2404f', shortcut: 'cmd+3' },
  { name: 'anytime', label: 'Anytime', icon: 'square.stack.3d.up.fill', color: '#3ea79a', shortcut: 'cmd+4' },
  { name: 'someday', label: 'Someday', icon: 'archivebox.fill', color: '#c6b26b', shortcut: 'cmd+5' },
  { name: 'logbook', label: 'Logbook', icon: 'checkmark.square.fill', color: '#58b05c', shortcut: 'cmd+6' },
]

/** The sidebar row id for a pane. */
export function navId(nav: Nav): string {
  if (nav.section === 'notes') {
    const folder = nav.folder
    if (folder === 'all') return 'notes:all'
    if (folder === 'trash') return 'notes:trash'
    return typeof folder === 'number' ? `folder:${folder}` : folder
  }
  if (nav.section === 'prompts') return `library:${nav.library}`
  const view = nav.view
  return view.kind === 'list' ? `list:${view.name}` : `${view.kind}:${view.id}`
}

/** The pane a sidebar row opens, or null for an id that names nothing. */
export function parseNav(id: string): Nav | null {
  const at = id.indexOf(':')
  const kind = at < 0 ? id : id.slice(0, at)
  const rest = at < 0 ? '' : id.slice(at + 1)
  const number = Number(rest)
  if (kind === 'list') return SMART_LISTS.some(list => list.name === rest) ? { section: 'todos', view: { kind: 'list', name: rest as SmartList } } : null
  if (kind === 'notes' && (rest === 'all' || rest === 'trash')) return { section: 'notes', folder: rest }
  if (kind === 'tag') return /^[\w-]{1,40}$/.test(rest) ? { section: 'notes', folder: `tag:${rest.toLowerCase()}` } : null
  if (!Number.isInteger(number) || number <= 0) return null
  if (kind === 'project' || kind === 'area') return { section: 'todos', view: { kind, id: number } }
  if (kind === 'folder') return { section: 'notes', folder: number }
  if (kind === 'library') return { section: 'prompts', library: number }
  return null
}

export interface SidebarItem { id: string, label: string, icon: string, color?: string, badge: string }
export interface SidebarSection { id: string, header?: string, items: SidebarItem[] }

const badge = (count: number | undefined): string => (count ? String(count) : '')

/** The SF Symbol for a project's progress ring: empty, a quarter, half, three quarters, done. */
export function progressSymbol(progress: number): string {
  if (progress >= 1) return 'checkmark.circle.fill'
  if (progress >= 0.75) return 'circle.inset.filled'
  if (progress >= 0.5) return 'circle.righthalf.filled'
  if (progress > 0) return 'circle.bottomrighthalf.pattern.checkered'
  return 'circle'
}

/** Finished and open to-do counts per project, for the progress rings. */
export function projectProgress(open: Todo[], logbook: Todo[]): Map<number, number> {
  const totals = new Map<number, { open: number, done: number }>()
  const add = (id: number | null, key: 'open' | 'done'): void => {
    if (!id) return
    const entry = totals.get(id) ?? { open: 0, done: 0 }
    entry[key]++
    totals.set(id, entry)
  }
  for (const todo of open) add(todo.project_id, 'open')
  for (const todo of logbook) if (todo.completed_at) add(todo.project_id, 'done')
  const result = new Map<number, number>()
  for (const [id, { open: o, done }] of totals) result.set(id, o + done ? done / (o + done) : 0)
  return result
}

export interface SidebarExtras {
  counts?: Partial<SidebarData['lists']>
  progress?: Map<number, number>
  tags?: Array<{ name: string, count: number }>
  trash?: number
}

/**
 * Things' outline: Inbox; Today to Someday; Logbook; projects and areas. Each
 * group is its own section with no header, which the host draws with a gap.
 * Then Notes (All Notes, folders, Recently Deleted), note tags, prompt
 * libraries and the libraries other people shared. Empty groups are left out.
 */
export function sidebarSections(data: SidebarData | null, libraries: LibraryList | null, extras: SidebarExtras = {}): SidebarSection[] {
  const lists = { ...data?.lists, ...extras.counts }
  const shown: Partial<Record<SmartList, number>> = { inbox: lists.inbox, today: lists.today }
  const smart = (name: SmartList): SidebarItem => {
    const list = SMART_LISTS.find(l => l.name === name)!
    return { id: `list:${name}`, label: list.label, icon: list.icon, color: list.color, badge: badge(shown[name]) }
  }
  const sections: SidebarSection[] = [
    { id: 'inbox', items: [smart('inbox')] },
    { id: 'lists', items: [smart('today'), smart('upcoming'), smart('anytime'), smart('someday')] },
    { id: 'logbook', items: [smart('logbook')] },
  ]

  const projects = data?.projects ?? []
  const areas = data?.areas ?? []
  const project = (p: Project): SidebarItem => ({ id: `project:${p.id}`, label: p.title, icon: progressSymbol(extras.progress?.get(p.id) ?? 0), color: '#2f6fe4', badge: badge(p.open) })
  const places: SidebarItem[] = projects.filter(p => !p.area_id || !areas.some(a => a.id === p.area_id)).map(project)
  for (const area of areas) {
    places.push({ id: `area:${area.id}`, label: area.title, icon: 'shippingbox', color: '#8e8e93', badge: '' })
    places.push(...projects.filter(p => p.area_id === area.id).map(project))
  }
  if (places.length) sections.push({ id: 'areas', items: places })

  sections.push({
    id: 'notes',
    header: 'Notes',
    items: [
      { id: 'notes:all', label: 'All Notes', icon: 'note.text', color: '#e8a10c', badge: badge(data?.notes) },
      ...(data?.note_folders ?? []).map((folder: NoteFolder) => ({ id: `folder:${folder.id}`, label: folder.title, icon: 'folder', color: '#e8a10c', badge: badge(folder.notes) })),
      { id: 'notes:trash', label: 'Recently Deleted', icon: 'trash', color: '#8e8e93', badge: badge(extras.trash) },
    ],
  })
  if (extras.tags?.length) sections.push({ id: 'tags', header: 'Tags', items: extras.tags.map(tag => ({ id: `tag:${tag.name}`, label: `#${tag.name}`, icon: 'number', color: '#8e8e93', badge: badge(tag.count) })) })

  const library = (lib: Library, icon: string): SidebarItem => ({ id: `library:${lib.id}`, label: lib.title, icon, color: libraryColor(lib.color), badge: badge(lib.prompts) })
  const owned = libraries?.owned ?? data?.libraries ?? []
  if (owned.length) sections.push({ id: 'libraries', header: 'Prompt Libraries', items: owned.map(lib => library(lib, 'text.book.closed.fill')) })
  const shared = libraries?.shared ?? []
  if (shared.length) sections.push({ id: 'shared', header: 'Shared with Me', items: shared.map(lib => ({ ...library(lib, 'person.2.fill'), badge: lib.role === 'editor' ? 'Editor' : 'Viewer' })) })
  return sections
}

/** Library colours are hex; anything else (an old or empty value) falls back to the accent blue. */
export function libraryColor(color: string | undefined): string {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : '#1a8cff'
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
  if (nav.section === 'notes') {
    const folder = nav.folder
    if (folder === 'all') return 'All Notes'
    if (folder === 'trash') return 'Recently Deleted'
    if (typeof folder === 'string') return `#${folder.slice(4)}`
    return data?.note_folders.find(f => f.id === folder)?.title ?? 'Folder'
  }
  if (nav.section === 'prompts') return findLibrary(libraries, nav.library)?.library.title ?? 'Prompt Library'
  const view = nav.view
  if (view.kind === 'list') return SMART_LISTS.find(list => list.name === view.name)?.label ?? 'To-Dos'
  if (view.kind === 'project') return data?.projects.find(p => p.id === view.id)?.title ?? 'Project'
  return data?.areas.find(a => a.id === view.id)?.title ?? 'Area'
}

// To-dos

/** What a new to-do gets in the open list, or null where nothing can be added (the Logbook). */
export function quickEntry(view: View, title: string, today: string): Partial<Todo> | null {
  const name = title.trim()
  const base = newTodoFor(view, today)
  if (!name || !base) return null
  return { ...base, title: name.slice(0, 255) }
}

export type BlockKind = 'plain' | 'evening' | 'day' | 'month' | 'project' | 'logday'
export interface TodoBlock { key: string, kind: BlockKind, label: string, number: string, symbol: string, projectId: number | null, items: Todo[] }

const block = (key: string, kind: BlockKind, items: Todo[], extra: Partial<TodoBlock> = {}): TodoBlock =>
  ({ key, kind, label: '', number: '', symbol: '', projectId: null, items, ...extra })

/**
 * A list laid out the way Things lays it out. Today: the day, then This
 * Evening. Upcoming: one block per day of the coming week, empty ones too,
 * then months. Anytime, Someday and areas: loose to-dos, then one block per
 * project. The Logbook: one block per day finished.
 */
export function todoBlocks(view: View, open: Todo[], logbook: Todo[], today: string, projects: Project[] = [], search = '', progress?: Map<number, number>): TodoBlock[] {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean)
  const match = (todo: Todo): boolean => !words.length || words.every(word => `${todo.title}\n${todo.notes}\n${todo.tags.join(' ')}`.toLowerCase().includes(word))
  const isLog = view.kind === 'list' && view.name === 'logbook'
  const items = viewItems(isLog ? [...open, ...logbook] : open, view, today).filter(match)
  if (view.kind === 'list' && view.name === 'today') {
    const { main, evening } = splitToday(items)
    const blocks = [block('today', 'plain', main)]
    if (evening.length) blocks.push(block('evening', 'evening', evening, { label: 'This Evening', symbol: 'moon.fill' }))
    return blocks
  }
  if (view.kind === 'list' && view.name === 'upcoming') {
    return groupUpcoming(items, today).map(day => block(day.key, day.number ? 'day' : 'month', day.items, { label: day.label, number: day.number }))
  }
  if (isLog) {
    const days = new Map<string, Todo[]>()
    for (const todo of items) {
      const at = String(todo.completed_at ?? todo.canceled_at ?? '').slice(0, 10)
      days.set(at, [...(days.get(at) ?? []), todo])
    }
    return [...days].sort((a, b) => b[0].localeCompare(a[0])).map(([day, rows]) => block(`log-${day}`, 'logday', rows, { label: day === today ? 'Today' : daysBetween(day, today) === 1 ? 'Yesterday' : shortDate(day, today) }))
  }
  if (view.kind === 'project') return [block('project', 'plain', items)]
  const loose = items.filter(todo => !todo.project_id)
  const blocks: TodoBlock[] = [block('loose', 'plain', loose)]
  const order = projects.map(p => p.id)
  const ids = [...new Set(items.filter(todo => todo.project_id).map(todo => todo.project_id!))]
    .sort((a, b) => (order.indexOf(a) + 1 || 1e9) - (order.indexOf(b) + 1 || 1e9))
  for (const id of ids) {
    const title = projects.find(p => p.id === id)?.title ?? 'Project'
    blocks.push(block(`project-${id}`, 'project', items.filter(todo => todo.project_id === id).sort(byOrder), { label: title, projectId: id, symbol: progressSymbol(progress?.get(id) ?? 0) }))
  }
  return blocks
}

export interface RowMarks {
  /** A yellow star before the title: the to-do is in Today, shown outside Today. */
  star: boolean
  /** The moon: in This Evening, shown outside Today. */
  evening: boolean
  notes: boolean
  project: string
  /** A scheduled date shown outside Upcoming. */
  date: string
  deadline: string
  overdue: boolean
  checklist: string
  repeat: boolean
  tags: string[]
}

/** What a row shows beside its title, the Things way: glyphs and grey text, no pills except tags. */
export function rowMarks(todo: Todo, view: View, today: string, projectTitle?: (id: number) => string | undefined): RowMarks {
  const list = view.kind === 'list' ? view.name : null
  const open = !todo.completed_at && !todo.canceled_at
  const scheduled = !!todo.start_date && todo.start_date > today
  const inToday = open && !scheduled && (todo.when === 'today' || todo.when === 'evening' || (!!todo.start_date && todo.start_date <= today))
  const done = todo.checklist.filter(item => item.done).length
  return {
    star: inToday && list !== 'today' && todo.when !== 'evening',
    evening: inToday && list !== 'today' && todo.when === 'evening',
    notes: !!todo.notes?.trim(),
    project: todo.project_id && view.kind !== 'project' ? projectTitle?.(todo.project_id) ?? '' : '',
    date: open && scheduled && list !== 'upcoming' ? shortDate(todo.start_date!, today) : '',
    deadline: open && todo.deadline ? deadlineLabel(todo.deadline, today) : '',
    overdue: open && !!todo.deadline && deadlineState(todo.deadline, today) !== 'later',
    checklist: todo.checklist.length ? `${done}/${todo.checklist.length}` : '',
    repeat: !!todo.repeat && todo.repeat !== 'none',
    tags: todo.tags.slice(0, 3),
  }
}

/** The When chip in an open to-do: what it says and its glyph. */
export function whenChip(todo: Pick<Todo, 'when' | 'start_date'>, today: string): { label: string, symbol: string, color: string } {
  if (todo.start_date && todo.start_date > today) return { label: shortDate(todo.start_date, today), symbol: 'calendar', color: '#f2404f' }
  if (todo.when === 'evening') return { label: 'This Evening', symbol: 'moon.fill', color: '#4f6bd8' }
  if (todo.when === 'today' || (todo.start_date && todo.start_date <= today)) return { label: 'Today', symbol: 'star.fill', color: '#f7c600' }
  if (todo.when === 'someday') return { label: 'Someday', symbol: 'archivebox.fill', color: '#c6b26b' }
  if (todo.when === 'anytime') return { label: 'Anytime', symbol: 'square.stack.3d.up.fill', color: '#3ea79a' }
  return { label: 'When', symbol: 'calendar', color: '#8e8e93' }
}

export const REPEATS = [
  { value: 'none', label: 'Never' },
  { value: 'daily', label: 'Every Day' },
  { value: 'weekly', label: 'Every Week' },
  { value: 'monthly', label: 'Every Month' },
  { value: 'yearly', label: 'Every Year' },
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
  if (/^(today|tomorrow)$/i.test(value)) return { ok: true, value: value.toLowerCase() }
  return isDay(value) ? { ok: true, value } : { ok: false }
}

/** `today` or `tomorrow` typed into a date field, made a date. */
export function resolveDay(value: string | null, today: string): string | null {
  if (value === 'today') return today
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

export type NoteFormat = Format | 'title'

/**
 * The Format menu applied without a caret (the host does not report one): line
 * formats change the last line that has text, bold and italic add an empty pair
 * at the end to type into. Title is a top-level heading.
 */
export function formatNote(body: string, kind: NoteFormat): string {
  const trimmed = body.replace(/\s+$/, '')
  if (kind === 'bold' || kind === 'italic') {
    const mark = kind === 'bold' ? '**' : '*'
    return `${trimmed}${trimmed ? ' ' : ''}${mark}${kind === 'bold' ? 'bold' : 'italic'}${mark}`
  }
  if (kind === 'title') {
    const lines = trimmed.split('\n')
    const index = lines.length - 1
    lines[index] = /^#\s/.test(lines[index]!) ? lines[index]!.replace(/^#\s+/, '') : `# ${lines[index]!.replace(/^#{1,3}\s+/, '')}`
    return lines.join('\n')
  }
  return applyFormat(trimmed, trimmed.length, trimmed.length, kind).body
}

const TAG = /(^|[\s(])#([A-Za-z0-9_-]{1,40})/g

/** The `#tags` in a note, lower case, each once. `# Heading` (a space after #) is not a tag. */
export function noteTagList(body: string): string[] {
  const found: string[] = []
  TAG.lastIndex = 0
  let match = TAG.exec(body)
  while (match) {
    const tag = match[2]!.toLowerCase()
    if (!found.includes(tag)) found.push(tag)
    match = TAG.exec(body)
  }
  return found
}

export function noteTagCounts(notes: Note[]): Array<{ name: string, count: number }> {
  const counts = new Map<string, number>()
  for (const note of notes) for (const tag of noteTagList(note.body)) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name))
}

/** The notes in a folder, a tag or all of them, holding every word of the search. */
export function notesIn(notes: Note[], folder: NoteFolderKey, search: string): Note[] {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean)
  return notes.filter((note) => {
    if (typeof folder === 'number' && note.note_folder_id !== folder) return false
    if (typeof folder === 'string' && folder.startsWith('tag:') && !noteTagList(note.body).includes(folder.slice(4))) return false
    if (!words.length) return true
    const text = `${note.title}\n${note.body}`.toLowerCase()
    return words.every(word => text.includes(word))
  })
}

export interface NoteGroup { key: string, label: string, notes: Note[] }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const localDay = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/**
 * Notes.app's list: Pinned first, then Today, Yesterday, Previous 7 Days,
 * Previous 30 Days, then one group per month (with the year once it is not
 * this year), newest edit first in each.
 */
export function noteDateGroups(notes: Note[], now: Date = new Date()): NoteGroup[] {
  const sorted = [...notes].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)) || b.id - a.id)
  const groups: NoteGroup[] = []
  const add = (key: string, label: string, note: Note): void => {
    let group = groups.find(g => g.key === key)
    if (!group) { group = { key, label, notes: [] }; groups.push(group) }
    group.notes.push(note)
  }
  const today = localDay(now)
  for (const note of sorted) {
    if (note.pinned) { add('pinned', 'Pinned', note); continue }
    const when = new Date(note.updated_at)
    if (Number.isNaN(when.getTime())) { add('older', 'Older', note); continue }
    const age = daysBetween(localDay(when), today)
    if (age <= 0) add('today', 'Today', note)
    else if (age === 1) add('yesterday', 'Yesterday', note)
    else if (age <= 7) add('week', 'Previous 7 Days', note)
    else if (age <= 30) add('month', 'Previous 30 Days', note)
    else add(`m-${when.getFullYear()}-${when.getMonth()}`, `${MONTHS[when.getMonth()]}${when.getFullYear() === now.getFullYear() ? '' : ` ${when.getFullYear()}`}`, note)
  }
  const rank = (key: string): number => ['pinned', 'today', 'yesterday', 'week', 'month'].indexOf(key)
  return groups.sort((a, b) => {
    const ra = rank(a.key)
    const rb = rank(b.key)
    if (ra >= 0 || rb >= 0) return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb)
    return b.notes[0]!.updated_at.localeCompare(a.notes[0]!.updated_at)
  })
}

/** A note's date in the list: a time today, `Yesterday`, a weekday this week, else a short date. Avoids Intl, which the script engine may lack. */
export function noteStamp(iso: string, now: Date = new Date()): string {
  const when = new Date(iso)
  if (Number.isNaN(when.getTime())) return ''
  const age = daysBetween(localDay(when), localDay(now))
  if (age <= 0) {
    const hours = when.getHours()
    return `${hours % 12 || 12}:${String(when.getMinutes()).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`
  }
  if (age === 1) return 'Yesterday'
  if (age < 7) return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][when.getDay()]!
  return `${when.getMonth() + 1}/${when.getDate()}/${String(when.getFullYear()).slice(2)}`
}

/** The second line of a note row: what follows the title, or "No additional text" as Notes says. */
export function noteSnippet(note: Note): string {
  const snippet = note.snippet?.trim()
  return snippet || 'No additional text'
}

// Inline completion (ghost text)

export type CompletionKind = 'note' | 'prompt' | 'todo-notes'

/** Wait this long after the last keystroke before asking for a completion. */
export const COMPLETION_DELAY = 600

/**
 * The request for a completion at the end of the text (the host reports no
 * caret, so the caret is taken to be at the end, where people type). Nothing
 * is asked for an empty text, one that ends mid-word-boundary noise, or a
 * very short one.
 */
export function completionRequest(kind: CompletionKind, text: string, context = ''): { kind: CompletionKind, context: string, before: string, after: string } | null {
  if (text.trim().length < 12) return null
  return { kind, context: context.slice(0, 500), before: text.slice(-4000), after: '' }
}

/** Accept a completion: append it, with a space where the text and the suggestion would run together. */
export function acceptCompletion(text: string, completion: string): string {
  if (!completion) return text
  const needsSpace = /\S$/.test(text) && /^[A-Za-z0-9]/.test(completion)
  return `${text}${needsSpace ? ' ' : ''}${completion}`
}

/** The suggestion trimmed to what fits after a caret: one paragraph, at most 200 characters. */
export function cleanCompletion(value: unknown): string {
  if (typeof value !== 'string') return ''
  const first = value.replace(/\r/g, '').split(/\n{2,}/)[0] ?? ''
  return first.slice(0, 200).replace(/\s+$/, '')
}

// Offline cache

export type CacheName = 'sidebar' | 'libraries' | 'todos' | 'notes' | 'trash' | `prompts.${number}`

/** Saved data is per account, so a second person signing in on the Mac never sees the first one's lists. */
export function cacheKey(account: number | string, name: CacheName): string {
  return `library.cache.${account}.${name}`
}

/** The most rows of each kind the cache keeps; UserDefaults is not a database. */
export const CACHE_LIMITS = { todos: 600, logbook: 200, notes: 300, prompts: 300 } as const

/** Trim what is about to be saved so a huge account cannot bloat the preferences file. */
export function capForCache<T>(name: CacheName, value: T): T {
  if (name === 'todos') {
    const todos = value as unknown as { open: unknown[], logbook: unknown[] }
    return { ...todos, open: todos.open.slice(0, CACHE_LIMITS.todos), logbook: todos.logbook.slice(0, CACHE_LIMITS.logbook) } as T
  }
  if ((name === 'notes' || name === 'trash') && Array.isArray(value)) return value.slice(0, CACHE_LIMITS.notes) as T
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
