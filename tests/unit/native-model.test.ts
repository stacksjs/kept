import { describe, expect, it } from 'bun:test'
import { acceptCompletion, appendCheckLine, cacheKey, capForCache, checkLines, cleanCompletion, completionRequest, eventText, eventValue, fillPrompt, findLibrary, formatNote, isOfflineError, navId, navTitle, noteDateGroups, noteSnippet, noteStamp, noteTagCounts, noteTagList, notesIn, parseDayField, parseNav, progressSymbol, projectProgress, splitBlocks, blockHeader, promptVariables, quickEntry, resolveDay, rowMarks, shareLink, sidebarSections, todoBlocks, toggleChecklist, unfilled, whenChip } from '../../resources/functions/kept/native-model'
import type { LibraryList, Note, SidebarData, Todo } from '../../resources/functions/kept/types'

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
  it('groups the lists the way Things does, then notes, tags and libraries', () => {
    const sections = sidebarSections(sidebar, libraries, { tags: [{ name: 'trip', count: 2 }], trash: 1, progress: new Map([[7, 0.5]]) })
    expect(sections.map(s => s.id)).toEqual(['inbox', 'lists', 'logbook', 'areas', 'notes', 'tags', 'libraries', 'shared'])
    expect(sections.slice(0, 4).every(s => !s.header)).toBe(true)
    expect(sections[1]!.items.map(i => [i.id, i.badge])).toEqual([['list:today', '4'], ['list:upcoming', ''], ['list:anytime', ''], ['list:someday', '']])
    expect(sections[0]!.items[0]!.badge).toBe('2')
    // A project with no area comes first, then each area followed by its projects; rings show progress.
    expect(sections[3]!.items.map(i => i.id)).toEqual(['project:8', 'area:1', 'project:7'])
    expect(sections[3]!.items[2]!.icon).toBe('circle.righthalf.filled')
    expect(sections[4]!.items.map(i => [i.id, i.badge])).toEqual([['notes:all', '5'], ['folder:3', '2'], ['notes:trash', '1']])
    expect(sections[5]!.items[0]).toMatchObject({ id: 'tag:trip', label: '#trip', badge: '2' })
    expect(sections[6]!.items[0]).toMatchObject({ id: 'library:4', color: '#0f8a5f', badge: '2' })
    expect(sections[7]!.items[0]).toMatchObject({ id: 'library:9', color: '#1a8cff', badge: 'Viewer' })
  })

  it('prefers counts computed on the device and drops empty groups', () => {
    const sections = sidebarSections({ ...sidebar, areas: [], projects: [] }, { owned: [], shared: [] }, { counts: { inbox: 0, today: 9 } })
    expect(sections.map(s => s.id)).toEqual(['inbox', 'lists', 'logbook', 'notes'])
    expect(sections[0]!.items[0]!.badge).toBe('')
    expect(sections[1]!.items[0]!.badge).toBe('9')
    expect(sidebarSections(null, null).map(s => s.id)).toEqual(['inbox', 'lists', 'logbook', 'notes'])
  })

  it('round-trips sidebar ids and rejects junk', () => {
    for (const id of ['list:today', 'project:7', 'area:1', 'notes:all', 'notes:trash', 'folder:3', 'tag:trip', 'library:4']) expect(navId(parseNav(id)!)).toBe(id)
    expect(parseNav('list:nope')).toBeNull()
    expect(parseNav('project:abc')).toBeNull()
    expect(parseNav('library:-1')).toBeNull()
    expect(parseNav('tag:has space')).toBeNull()
    expect(parseNav('')).toBeNull()
  })

  it('titles each pane', () => {
    expect(navTitle(parseNav('list:upcoming')!, sidebar, libraries)).toBe('Upcoming')
    expect(navTitle(parseNav('project:7')!, sidebar, libraries)).toBe('Garden')
    expect(navTitle(parseNav('folder:3')!, sidebar, libraries)).toBe('Recipes')
    expect(navTitle(parseNav('notes:trash')!, sidebar, libraries)).toBe('Recently Deleted')
    expect(navTitle(parseNav('tag:trip')!, sidebar, libraries)).toBe('#trip')
    expect(navTitle(parseNav('library:9')!, sidebar, libraries)).toBe('Team')
  })

  it('knows who may edit a library', () => {
    expect(findLibrary(libraries, 4)).toMatchObject({ owned: true, canEdit: true })
    expect(findLibrary(libraries, 9)).toMatchObject({ owned: false, canEdit: false })
    expect(findLibrary({ owned: [], shared: [{ ...libraries.shared[0]!, role: 'editor' }] }, 9)?.canEdit).toBe(true)
    expect(findLibrary(libraries, 99)).toBeNull()
  })

  it('draws a project ring by progress', () => {
    expect([0, 0.2, 0.5, 0.8, 1].map(progressSymbol)).toEqual(['circle', 'circle.bottomrighthalf.pattern.checkered', 'circle.righthalf.filled', 'circle.inset.filled', 'checkmark.circle.fill'])
    const progress = projectProgress([todo({ project_id: 7 })], [todo({ project_id: 7, completed_at: 'x' }), todo({ project_id: 7, completed_at: 'y' }), todo({ project_id: 8, canceled_at: 'z' })])
    expect(progress.get(7)).toBeCloseTo(2 / 3)
    expect(progress.get(8)).toBeUndefined()
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
  const projects = [{ id: 7, title: 'Garden', notes: '', area_id: null, when: 'anytime' as const, deadline: null }]

  it('splits Today into the day and This Evening', () => {
    const open = [todo({ when: 'today', title: 'a' }), todo({ when: 'evening', title: 'b' })]
    const blocks = todoBlocks({ kind: 'list', name: 'today' }, open, [], today)
    expect(blocks.map(b => [b.kind, b.label, b.items.map(t => t.title)])).toEqual([['plain', '', ['a']], ['evening', 'This Evening', ['b']]])
  })

  it('gives Upcoming a block for every day of the week, then months, and filters by search', () => {
    const open = [todo({ when: 'anytime', start_date: '2026-11-01', title: 'Flights' }), todo({ when: 'anytime', start_date: '2026-11-20', title: 'Hotel', tags: ['travel'] })]
    const blocks = todoBlocks({ kind: 'list', name: 'upcoming' }, open, [], today)
    expect(blocks.slice(0, 3).map(b => [b.kind, b.number, b.label])).toEqual([['day', '31', 'Tomorrow'], ['day', '1', 'Sunday'], ['day', '2', 'Monday']])
    expect(blocks.find(b => b.number === '1')!.items.map(t => t.title)).toEqual(['Flights'])
    expect(blocks.at(-1)).toMatchObject({ kind: 'month', label: 'November' })
    const found = todoBlocks({ kind: 'list', name: 'upcoming' }, open, [], today, [], 'travel')
    expect(found.flatMap(b => b.items.map(t => t.title))).toEqual(['Hotel'])
  })

  it('puts loose to-dos first in Anytime, then one block per project with its ring', () => {
    const open = [todo({ when: 'anytime', title: 'Loose' }), todo({ when: 'anytime', title: 'Beds', project_id: 7 })]
    const blocks = todoBlocks({ kind: 'list', name: 'anytime' }, open, [], today, projects, '', new Map([[7, 0.5]]))
    expect(blocks.map(b => [b.kind, b.label, b.items.map(t => t.title)])).toEqual([['plain', '', ['Loose']], ['project', 'Garden', ['Beds']]])
    expect(blocks[1]!.symbol).toBe('circle.righthalf.filled')
  })

  it('groups the Logbook by the day each was finished', () => {
    const done = [todo({ completed_at: '2026-10-30T10:00:00Z', title: 'A' }), todo({ completed_at: '2026-10-29T10:00:00Z', title: 'B' })]
    expect(todoBlocks({ kind: 'list', name: 'logbook' }, [todo()], done, today).map(b => [b.label, b.items.map(t => t.title)])).toEqual([['Today', ['A']], ['Yesterday', ['B']]])
  })

  it('marks a row the Things way', () => {
    const row = todo({ project_id: 7, when: 'today', notes: 'x', deadline: '2026-10-29', repeat: 'weekly', tags: ['phone'], checklist: [{ id: 1, todo_id: 1, title: 'a', done: true, sort_order: 0 }, { id: 2, todo_id: 1, title: 'b', done: false, sort_order: 1 }] })
    const marks = rowMarks(row, { kind: 'list', name: 'anytime' }, today, id => (id === 7 ? 'Garden' : undefined))
    expect(marks).toMatchObject({ star: true, evening: false, notes: true, project: 'Garden', date: '', deadline: '1 day overdue', overdue: true, checklist: '1/2', repeat: true, tags: ['phone'] })
    expect(rowMarks(todo({ when: 'today' }), { kind: 'list', name: 'today' }, today).star).toBe(false)
    expect(rowMarks(todo({ when: 'evening' }), { kind: 'list', name: 'anytime' }, today).evening).toBe(true)
    expect(rowMarks(todo({ when: 'anytime', start_date: '2026-11-04' }), { kind: 'list', name: 'anytime' }, today).date).toBe('Nov 4')
    expect(rowMarks(todo({ when: 'anytime', start_date: '2026-11-04' }), { kind: 'list', name: 'upcoming' }, today).date).toBe('')
    expect(rowMarks(todo({ deadline: '2026-11-20' }), { kind: 'list', name: 'inbox' }, today).overdue).toBe(false)
  })

  it('cuts the list at the open to-do so the editor is drawn once', () => {
    const open = [todo({ when: 'today', title: 'a' }), todo({ when: 'today', title: 'b' }), todo({ when: 'today', title: 'c' }), todo({ when: 'evening', title: 'd' })]
    const blocks = todoBlocks({ kind: 'list', name: 'today' }, open, [], today)
    const cut = splitBlocks(blocks, open[1]!.id)
    expect(cut.open?.title).toBe('b')
    expect(cut.before.map(b => b.items.map(t => t.title))).toEqual([['a']])
    expect(cut.after.map(b => [b.kind, b.items.map(t => t.title)])).toEqual([['rest', ['c']], ['evening', ['d']]])
    expect(blockHeader(cut.after[0]!).show).toBe(false)
    expect(splitBlocks(blocks, 0)).toEqual({ before: blocks, open: null, after: [] })
    expect(splitBlocks(blocks, 999).open).toBeNull()
  })

  it('gives every block kind one heading shape', () => {
    expect(blockHeader({ key: 'd', kind: 'day', label: 'Tomorrow', number: '31', symbol: '', projectId: null, items: [] })).toMatchObject({ show: true, number: '31', muted: true, ruleAbove: true, gap: 26 })
    expect(blockHeader({ key: 'p', kind: 'project', label: 'Garden', number: '', symbol: 'circle', projectId: 7, items: [] })).toMatchObject({ symbol: 'circle', ruleBelow: true })
    expect(blockHeader({ key: 'e', kind: 'evening', label: 'This Evening', number: '', symbol: '', projectId: null, items: [] }).symbol).toBe('moon.fill')
    expect(blockHeader({ key: 'x', kind: 'plain', label: '', number: '', symbol: '', projectId: null, items: [] }).show).toBe(false)
  })

  it('labels the When chip', () => {
    expect(whenChip({ when: 'today', start_date: null }, today).label).toBe('Today')
    expect(whenChip({ when: 'evening', start_date: null }, today).symbol).toBe('moon.fill')
    expect(whenChip({ when: 'anytime', start_date: '2026-11-04' }, today).label).toBe('Nov 4')
    expect(whenChip({ when: 'inbox', start_date: null }, today).label).toBe('When')
  })

  it('reads typed dates', () => {
    expect(parseDayField('')).toEqual({ ok: true, value: null })
    expect(parseDayField('2026-11-04')).toEqual({ ok: true, value: '2026-11-04' })
    expect(parseDayField('2026-02-30')).toEqual({ ok: false })
    expect(parseDayField('2026-1')).toEqual({ ok: false })
    expect(resolveDay('tomorrow', today)).toBe('2026-10-31')
    expect(resolveDay('today', today)).toBe(today)
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

  it('dates a note the way Notes does, without Intl', () => {
    const now = new Date(2026, 9, 30, 15, 0)
    expect(noteStamp(new Date(2026, 9, 30, 9, 5).toISOString(), now)).toBe('9:05 AM')
    expect(noteStamp(new Date(2026, 9, 30, 13, 40).toISOString(), now)).toBe('1:40 PM')
    expect(noteStamp(new Date(2026, 9, 29, 13, 40).toISOString(), now)).toBe('Yesterday')
    expect(noteStamp(new Date(2026, 9, 27, 13, 40).toISOString(), now)).toBe('Tuesday')
    expect(noteStamp(new Date(2026, 8, 2, 13, 40).toISOString(), now)).toBe('9/2/26')
    expect(noteStamp('garbage', now)).toBe('')
  })

  it('groups the list by date with Pinned first', () => {
    const now = new Date(2026, 9, 30, 15, 0)
    const at = (d: Date): string => d.toISOString()
    const make = (id: number, updated: string, pinned = false): Note => ({ id, title: `n${id}`, snippet: '', body: '', pinned, note_folder_id: null, updated_at: updated })
    const groups = noteDateGroups([
      make(1, at(new Date(2026, 9, 30, 9))),
      make(2, at(new Date(2026, 9, 29, 9))),
      make(3, at(new Date(2026, 9, 26, 9))),
      make(4, at(new Date(2026, 9, 10, 9))),
      make(5, at(new Date(2026, 6, 4, 9))),
      make(6, at(new Date(2025, 11, 4, 9))),
      make(7, at(new Date(2026, 6, 4, 9)), true),
    ], now)
    expect(groups.map(g => [g.label, g.notes.map(n => n.id)])).toEqual([['Pinned', [7]], ['Today', [1]], ['Yesterday', [2]], ['Previous 7 Days', [3]], ['Previous 30 Days', [4]], ['July', [5]], ['December 2025', [6]]])
  })

  it('reads #tags and filters by folder, tag and words', () => {
    const notes: Note[] = [
      { id: 1, title: 'Trip', snippet: '', body: '# Trip\nPack #travel and #Gear', pinned: false, note_folder_id: 3, updated_at: '' },
      { id: 2, title: 'Food', snippet: '', body: 'Soup #food', pinned: false, note_folder_id: null, updated_at: '' },
    ]
    expect(noteTagList(notes[0]!.body)).toEqual(['travel', 'gear'])
    expect(noteTagCounts(notes)).toEqual([{ name: 'food', count: 1 }, { name: 'gear', count: 1 }, { name: 'travel', count: 1 }])
    expect(notesIn(notes, 3, '').map(n => n.id)).toEqual([1])
    expect(notesIn(notes, 'tag:food', '').map(n => n.id)).toEqual([2])
    expect(notesIn(notes, 'all', 'soup').map(n => n.id)).toEqual([2])
    expect(noteSnippet({ ...notes[0]!, snippet: '' })).toBe('No additional text')
  })

  it('formats without a caret', () => {
    expect(formatNote('Plan\nBuy milk', 'check')).toBe('Plan\n- [ ] Buy milk')
    expect(formatNote('Plan\nBuy milk', 'list')).toBe('Plan\n- Buy milk')
    expect(formatNote('Plan\nShopping', 'heading')).toBe('Plan\n# Shopping')
    expect(formatNote('Plan', 'title')).toBe('# Plan')
    expect(formatNote('# Plan', 'title')).toBe('Plan')
    expect(formatNote('Plan', 'bold')).toBe('Plan **bold**')
    expect(formatNote('', 'italic')).toBe('*italic*')
  })
})

describe('native completions', () => {
  it('asks only once there is something to continue', () => {
    expect(completionRequest('note', 'short')).toBeNull()
    expect(completionRequest('note', 'A long enough sentence', 'Trip')).toEqual({ kind: 'note', context: 'Trip', before: 'A long enough sentence', after: '' })
  })

  it('joins and trims a suggestion', () => {
    expect(acceptCompletion('Pack the', 'blue bag')).toBe('Pack the blue bag')
    expect(acceptCompletion('Pack the ', 'blue bag')).toBe('Pack the blue bag')
    expect(acceptCompletion('End.', '')).toBe('End.')
    expect(cleanCompletion('one paragraph\n\nanother')).toBe('one paragraph')
    expect(cleanCompletion(42)).toBe('')
    expect(cleanCompletion('x'.repeat(300)).length).toBe(200)
  })
})

describe('native offline cache', () => {
  it('keys saved data by account', () => {
    expect(cacheKey(11, 'todos')).toBe('library.cache.11.todos')
    expect(cacheKey(11, 'prompts.4')).toBe('library.cache.11.prompts.4')
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
