import { describe, expect, it } from 'bun:test'
import { appendCheckLine, cacheKey, capForCache, checkLines, chipColors, eventText, eventValue, fillPrompt, findLibrary, isOfflineError, navId, navTitle, noteStamp, parseDayField, parseNav, promptVariables, quickEntry, resolveDay, shareLink, sidebarSections, todoChips, todoGroups, toggleChecklist, unfilled } from '../../resources/functions/kept/native-model'
import type { LibraryList, SidebarData, Todo } from '../../resources/functions/kept/types'

const today = '2026-10-30'
let next = 1
function todo(patch: Partial<Todo> = {}): Todo {
  return { id: next++, title: 'x', notes: '', when: 'inbox', start_date: null, deadline: null, tags: [], repeat: 'none', sort_order: 0, completed_at: null, canceled_at: null, area_id: null, project_id: null, heading_id: null, checklist: [], ...patch }
}

const sidebar: SidebarData = {
  lists: { inbox: 2, today: 4, upcoming: 1, anytime: 3, someday: 0, evening: 1, overdue: 1 },
  areas: [{ id: 1, title: 'Home', icon: 'folder', sort_order: 0 }],
  projects: [
    { id: 7, title: 'Garden', notes: '', area_id: 1, when: 'anytime', deadline: null, open: 3 },
    { id: 8, title: 'Loose', notes: '', area_id: null, when: 'anytime', deadline: null, open: 0 },
  ],
  note_folders: [{ id: 3, title: 'Recipes', notes: 2 }],
  notes: 5,
  libraries: [],
}
const libraries: LibraryList = {
  owned: [{ id: 4, title: 'Writing', description: '', icon: '', color: '#0f8a5f', prompts: 2 }],
  shared: [{ id: 9, title: 'Team', description: '', icon: '', color: 'nonsense', prompts: 1, role: 'viewer', owner: 'Ana' }],
}

describe('native sidebar', () => {
  it('lists the smart lists, areas with their projects, notes and libraries', () => {
    const sections = sidebarSections(sidebar, libraries)
    expect(sections.map(s => s.header ?? '')).toEqual(['', 'Areas', 'Notes', 'Prompt Libraries', 'Shared with me'])
    expect(sections[0]!.items.map(i => i.id)).toEqual(['list:inbox', 'list:today', 'list:upcoming', 'list:anytime', 'list:someday', 'list:logbook'])
    expect(sections[0]!.items.map(i => i.badge)).toEqual(['2', '4', '', '', '', ''])
    // A project with no area comes first, then each area followed by its projects.
    expect(sections[1]!.items.map(i => i.id)).toEqual(['project:8', 'area:1', 'project:7'])
    expect(sections[2]!.items.map(i => [i.id, i.badge])).toEqual([['notes:all', '5'], ['folder:3', '2']])
    expect(sections[3]!.items[0]).toMatchObject({ id: 'library:4', color: '#0f8a5f', badge: '2' })
    expect(sections[4]!.items[0]).toMatchObject({ id: 'library:9', color: '#1a7cf5', badge: 'Viewer' })
  })

  it('prefers counts computed on the device and drops empty groups', () => {
    const sections = sidebarSections({ ...sidebar, areas: [], projects: [] }, { owned: [], shared: [] }, { inbox: 0, today: 9 })
    expect(sections.map(s => s.id)).toEqual(['lists', 'notes'])
    expect(sections[0]!.items[0]!.badge).toBe('')
    expect(sections[0]!.items[1]!.badge).toBe('9')
    expect(sidebarSections(null, null).map(s => s.id)).toEqual(['lists', 'notes'])
  })

  it('round-trips sidebar ids and rejects junk', () => {
    for (const id of ['list:today', 'project:7', 'area:1', 'notes:all', 'folder:3', 'library:4']) expect(navId(parseNav(id)!)).toBe(id)
    expect(parseNav('list:nope')).toBeNull()
    expect(parseNav('project:abc')).toBeNull()
    expect(parseNav('library:-1')).toBeNull()
    expect(parseNav('')).toBeNull()
  })

  it('titles each pane', () => {
    expect(navTitle(parseNav('list:upcoming')!, sidebar, libraries)).toBe('Upcoming')
    expect(navTitle(parseNav('project:7')!, sidebar, libraries)).toBe('Garden')
    expect(navTitle(parseNav('folder:3')!, sidebar, libraries)).toBe('Recipes')
    expect(navTitle(parseNav('library:9')!, sidebar, libraries)).toBe('Team')
  })

  it('knows who may edit a library', () => {
    expect(findLibrary(libraries, 4)).toMatchObject({ owned: true, canEdit: true })
    expect(findLibrary(libraries, 9)).toMatchObject({ owned: false, canEdit: false })
    expect(findLibrary({ owned: [], shared: [{ ...libraries.shared[0]!, role: 'editor' }] }, 9)?.canEdit).toBe(true)
    expect(findLibrary(libraries, 99)).toBeNull()
  })
})

describe('native quick entry', () => {
  it('files a new to-do where it was typed', () => {
    expect(quickEntry({ kind: 'list', name: 'today' }, '  Call mum ', today)).toEqual({ when: 'today', title: 'Call mum' })
    expect(quickEntry({ kind: 'list', name: 'someday' }, 'Piano', today)).toEqual({ when: 'someday', title: 'Piano' })
    expect(quickEntry({ kind: 'list', name: 'inbox' }, 'Milk', today)).toEqual({ when: 'inbox', title: 'Milk' })
    expect(quickEntry({ kind: 'list', name: 'upcoming' }, 'Trip', today)).toEqual({ when: 'anytime', start_date: '2026-10-31', title: 'Trip' })
    expect(quickEntry({ kind: 'project', id: 7 }, 'Beds', today)).toEqual({ project_id: 7, when: 'anytime', title: 'Beds' })
    expect(quickEntry({ kind: 'area', id: 1 }, 'Shed', today)).toEqual({ area_id: 1, when: 'anytime', title: 'Shed' })
  })

  it('adds nothing to the Logbook or for a blank title', () => {
    expect(quickEntry({ kind: 'list', name: 'logbook' }, 'Done', today)).toBeNull()
    expect(quickEntry({ kind: 'list', name: 'today' }, '   ', today)).toBeNull()
  })
})

describe('native to-do list', () => {
  it('splits Today into the day and This Evening', () => {
    const open = [todo({ when: 'today', title: 'a' }), todo({ when: 'evening', title: 'b' })]
    const groups = todoGroups({ kind: 'list', name: 'today' }, open, [], today)
    expect(groups.map(g => [g.label, g.items.map(t => t.title)])).toEqual([['', ['a']], ['This Evening', ['b']]])
  })

  it('groups Upcoming by day and filters by search', () => {
    const open = [todo({ when: 'anytime', start_date: '2026-11-01', title: 'Flights' }), todo({ when: 'anytime', start_date: '2026-11-02', title: 'Hotel', tags: ['travel'] })]
    const groups = todoGroups({ kind: 'list', name: 'upcoming' }, open, [], today)
    expect(groups.map(g => g.label)).toEqual(['Sunday', 'Monday'])
    const found = todoGroups({ kind: 'list', name: 'upcoming' }, open, [], today, 'travel')
    expect(found.flatMap(g => g.items.map(t => t.title))).toEqual(['Hotel'])
  })

  it('shows finished to-dos in the Logbook', () => {
    const done = todo({ completed_at: '2026-10-29T10:00:00Z', title: 'Done' })
    expect(todoGroups({ kind: 'list', name: 'logbook' }, [todo()], [done], today)[0]!.items.map(t => t.title)).toEqual(['Done'])
  })

  it('labels a row with its project, date, deadline, repeat, checklist and tags', () => {
    const row = todo({ project_id: 7, when: 'today', deadline: '2026-10-29', repeat: 'weekly', tags: ['phone'], checklist: [{ id: 1, todo_id: 1, title: 'a', done: true, sort_order: 0 }, { id: 2, todo_id: 1, title: 'b', done: false, sort_order: 1 }] })
    const chips = todoChips(row, { kind: 'list', name: 'anytime' }, today, id => (id === 7 ? 'Garden' : undefined))
    expect(chips.map(c => [c.text, c.tone])).toEqual([['Garden', 'project'], ['Today', 'when'], ['1 day overdue', 'overdue'], ['Weekly', 'repeat'], ['1/2', 'check'], ['phone', 'tag']])
    // Inside Today the Today chip says nothing new; a scheduled one shows its date outside Upcoming.
    expect(todoChips(todo({ when: 'today' }), { kind: 'list', name: 'today' }, today)).toEqual([])
    expect(todoChips(todo({ when: 'anytime', start_date: '2026-11-04' }), { kind: 'list', name: 'anytime' }, today)[0]!.text).toBe('Nov 4')
    expect(todoChips(todo({ when: 'anytime', start_date: '2026-11-04' }), { kind: 'list', name: 'upcoming' }, today)).toEqual([])
    expect(todoChips(todo({ deadline: '2026-11-20' }), { kind: 'list', name: 'inbox' }, today)[0]!.tone).toBe('deadline')
  })

  it('gives every chip a colour pair on both surfaces', () => {
    for (const tone of ['when', 'overdue', 'due', 'deadline', 'tag', 'check', 'repeat', 'project'] as const) {
      expect(chipColors(tone, false).fg).toMatch(/^#/)
      expect(chipColors(tone, true).fg).toMatch(/^#/)
    }
  })

  it('reads typed dates', () => {
    expect(parseDayField('')).toEqual({ ok: true, value: null })
    expect(parseDayField('2026-11-04')).toEqual({ ok: true, value: '2026-11-04' })
    expect(parseDayField('2026-02-30')).toEqual({ ok: false })
    expect(parseDayField('2026-1')).toEqual({ ok: false })
    expect(resolveDay('tomorrow', today)).toBe('2026-10-31')
    expect(resolveDay(null, today)).toBeNull()
  })
})

describe('native prompts', () => {
  it('finds each variable once, in order', () => {
    expect(promptVariables('Write a {{tone}} email to {{ name }} in a {{tone}} way about {{topic.main}}')).toEqual(['tone', 'name', 'topic.main'])
    expect(promptVariables('no variables {{ }} {{1bad}}')).toEqual([])
  })

  it('fills what was typed and keeps the rest as placeholders', () => {
    const body = 'Write a {{tone}} email to {{name}}.'
    expect(fillPrompt(body, { tone: 'polite', name: '' })).toBe('Write a polite email to {{name}}.')
    expect(fillPrompt(body, { tone: 'polite', name: 'Ana' })).toBe('Write a polite email to Ana.')
    expect(unfilled(body, { tone: 'polite' })).toEqual(['name'])
    // Called twice in a row: a global regex must not carry its position over.
    expect(promptVariables(body)).toEqual(['tone', 'name'])
  })

  it('builds the read-only link from the app origin', () => {
    expect(shareLink('http://127.0.0.1:3408/', 'abc')).toBe('http://127.0.0.1:3408/p/abc')
  })
})

describe('native notes', () => {
  it('lists the check lines with their line numbers', () => {
    expect(checkLines('# Trip\n- [ ] Flights\n- [x] Passport\nplain')).toEqual([{ line: 1, text: 'Flights', done: false }, { line: 2, text: 'Passport', done: true }])
  })

  it('toggles the last line in and out of a checklist', () => {
    expect(toggleChecklist('Groceries\nMilk')).toBe('Groceries\n- [ ] Milk')
    expect(toggleChecklist('Groceries\n- [ ] Milk\n\n')).toBe('Groceries\nMilk\n\n')
    expect(toggleChecklist('- eggs')).toBe('- [ ] eggs')
    expect(toggleChecklist('')).toBe('- [ ] ')
    expect(appendCheckLine('Groceries\n')).toBe('Groceries\n- [ ] ')
    expect(appendCheckLine('')).toBe('- [ ] ')
  })

  it('dates a note without Intl', () => {
    const now = new Date(2026, 9, 30, 15, 0)
    expect(noteStamp(new Date(2026, 9, 30, 9, 5).toISOString(), now)).toBe('9:05 AM')
    expect(noteStamp(new Date(2026, 9, 30, 13, 40).toISOString(), now)).toBe('1:40 PM')
    expect(noteStamp(new Date(2026, 8, 2, 13, 40).toISOString(), now)).toBe('Sep 2')
    expect(noteStamp('garbage', now)).toBe('')
  })
})

describe('native offline cache', () => {
  it('keys saved data by account', () => {
    expect(cacheKey(11, 'todos')).toBe('kept.cache.11.todos')
    expect(cacheKey(11, 'prompts.4')).toBe('kept.cache.11.prompts.4')
  })

  it('caps what it keeps', () => {
    const many = Array.from({ length: 900 }, (_, i) => i)
    const todos = capForCache('todos', { open: many, logbook: many })
    expect(todos.open.length).toBe(600)
    expect(todos.logbook.length).toBe(200)
    expect(capForCache('notes', many).length).toBe(300)
    expect(capForCache('prompts.4', { role: 'owner', prompts: many }).prompts.length).toBe(300)
    expect(capForCache('sidebar', { a: 1 })).toEqual({ a: 1 })
  })

  it('tells being offline from being refused', () => {
    expect(isOfflineError(new TypeError('Network request failed'))).toBe(true)
    expect(isOfflineError({ code: 'NETWORK_ERROR', message: 'Could not connect to the server.' })).toBe(true)
    expect(isOfflineError(Object.assign(new Error('Unauthorized'), { status: 401 }))).toBe(false)
    expect(isOfflineError(null)).toBe(false)
  })
})

describe('native events', () => {
  it('reads the text and value of host events', () => {
    expect(eventText({ nativeEvent: { text: 'hi', value: 'hi' } })).toBe('hi')
    expect(eventText('raw')).toBe('raw')
    expect(eventText(null)).toBe('')
    expect(eventValue({ nativeEvent: { value: 'weekly' } })).toBe('weekly')
    expect(eventValue('x')).toBe('x')
  })
})
