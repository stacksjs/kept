import { defineStore, derived, state, useStore } from '@stacksjs/stx'
import { api, deviceDay } from '../functions/kept/client'
import { allTags, byOrder, counts, moveId, newTodoFor, normalizeItem, normalizeTodo, orderChanges, progress, serializeChanges, splitToday, viewItems } from '../functions/kept/todos'
import type { ChecklistItem, Todo } from '../functions/kept/types'

/**
 * Every to-do the person has, held once. Smart lists, projects, areas and the
 * sidebar counts are all computed from it with the same rules the server uses
 * (app/Support/lists.ts), so completing, moving or rescheduling a to-do
 * updates every pane at once without another round trip.
 */
defineStore('tasks', () => {
  const open = state<Todo[]>([])
  const logbook = state<Todo[]>([])
  const loaded = state(false)
  const today = state(deviceDay())
  /** A to-do that was just ticked stays in its list for a moment: checking, then leaving. */
  const fading = state<Record<number, 'done' | 'leaving'>>({})
  /** The row the keyboard is on (not necessarily open). */
  const cursor = state<number | null>(null)
  const quickTitle = state('')

  const workspace = (): any => useStore('workspace')

  const items = derived<Todo[]>(() => viewItems(open(), workspace().view(), today()))
  const logItems = derived<Todo[]>(() => logbook())
  const split = derived(() => splitToday(items()))
  const totals = derived(() => counts(open(), today()))
  const tags = derived(() => allTags([...open(), ...logbook()]))
  const canAdd = derived(() => newTodoFor(workspace().view(), today()) !== null)

  /** The open to-do, whichever list it is in. */
  const selected = derived<Todo | null>(() => {
    const route = workspace().route()
    const id = route.section === 'todos' ? route.item : null
    if (!id) return null
    return open().find(todo => todo.id === id) ?? logbook().find(todo => todo.id === id) ?? null
  })

  const openCount = (projectId: number): number => open().filter(todo => todo.project_id === projectId).length
  const doneCount = (projectId: number): number => logbook().filter(todo => todo.project_id === projectId && todo.completed_at).length
  const ring = (projectId: number): number => progress(openCount(projectId), doneCount(projectId))
  const areaCount = (areaId: number): number => open().filter(todo => todo.area_id === areaId && !todo.project_id).length

  const merge = (rows: Todo[]): Todo[] => [...new Map(rows.map(row => [row.id, row])).values()]

  async function load(): Promise<void> {
    const day = today()
    const names = ['inbox', 'today', 'upcoming', 'anytime', 'someday'] as const
    try {
      const [lists, log] = await Promise.all([Promise.all(names.map(name => api.list(name, day))), api.list('logbook', day)])
      open.set(merge(lists.flatMap(list => list.todos.map(row => normalizeTodo(row as unknown as Record<string, unknown>)))))
      logbook.set(log.todos.map(row => normalizeTodo(row as unknown as Record<string, unknown>)))
      loaded.set(true)
    }
    catch (cause) { workspace().fail(cause, 'Could not load your to-dos.') }
  }

  /** The calendar day moves on while the app stays open: re-read what Today and Upcoming hold. */
  async function refreshDay(): Promise<void> {
    const now = deviceDay()
    if (now === today()) return
    today.set(now)
    await Promise.all([load(), workspace().reloadSidebar()])
  }

  const find = (id: number): Todo | undefined => open().find(todo => todo.id === id) ?? logbook().find(todo => todo.id === id)
  const replace = (todo: Todo): void => {
    open.update(list => list.some(item => item.id === todo.id) ? list.map(item => item.id === todo.id ? todo : item) : list)
    logbook.update(list => list.some(item => item.id === todo.id) ? list.map(item => item.id === todo.id ? todo : item) : list)
  }

  // Creating

  async function create(title: string, extra: Partial<Todo> = {}): Promise<Todo | null> {
    const name = title.trim()
    const base = newTodoFor(workspace().view(), today())
    if (!name || (!base && !Object.keys(extra).length)) return null
    const bottom = Math.max(0, ...items().map(todo => todo.sort_order))
    try {
      const row = await api.createTodo(serializeChanges({ ...base, sort_order: bottom + 1, ...extra, title: name }) as Partial<Todo>)
      const todo = normalizeTodo(row as unknown as Record<string, unknown>)
      open.update(list => [...list, todo])
      cursor.set(todo.id)
      return todo
    }
    catch (cause) { workspace().fail(cause, 'Could not add the to-do.'); return null }
  }

  async function quickAdd(): Promise<void> {
    const title = quickTitle()
    quickTitle.set('')
    await create(title)
  }

  // Changing

  const pending = new Map<number, Partial<Todo>>()
  const timers = new Map<number, ReturnType<typeof setTimeout>>()

  async function flush(id: number): Promise<void> {
    clearTimeout(timers.get(id))
    timers.delete(id)
    const changes = pending.get(id)
    pending.delete(id)
    if (!changes) return
    try { await api.updateTodo(id, serializeChanges(changes) as Partial<Todo>) }
    catch (cause) { workspace().fail(cause, 'Could not save that change.'); await load() }
  }

  /** Apply a change now and write it a moment later, so typing a title is one request, not one per key. */
  function update(id: number, changes: Partial<Todo>, wait = 0): void {
    const todo = find(id)
    if (!todo) return
    replace({ ...todo, ...changes })
    pending.set(id, { ...pending.get(id), ...changes })
    clearTimeout(timers.get(id))
    if (wait === 0) { void flush(id); return }
    timers.set(id, setTimeout(() => void flush(id), wait))
  }

  /** Write anything still waiting, before the page goes away or another item opens. */
  async function flushAll(): Promise<void> {
    await Promise.all([...pending.keys()].map(flush))
  }

  async function remove(id: number): Promise<void> {
    open.update(list => list.filter(todo => todo.id !== id))
    logbook.update(list => list.filter(todo => todo.id !== id))
    pending.delete(id)
    if (workspace().route().item === id) workspace().openItem(null)
    try { await api.deleteTodo(id); await workspace().reloadSidebar() }
    catch (cause) { workspace().fail(cause, 'Could not delete the to-do.'); await load() }
  }

  // Completing

  const setFade = (id: number, stage: 'done' | 'leaving' | null): void => {
    fading.update((map) => {
      const next = { ...map }
      if (stage) next[id] = stage
      else delete next[id]
      return next
    })
  }

  /** Tick a to-do: the circle fills, the title strikes through, then the row leaves for the Logbook. */
  async function complete(id: number): Promise<void> {
    const todo = find(id)
    if (!todo || fading()[id]) return
    setFade(id, 'done')
    const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    try {
      const result = await api.completeTodo(id, today())
      const finished = normalizeTodo({ ...(result.todo as unknown as Record<string, unknown>), checklist: todo.checklist })
      setTimeout(() => setFade(id, 'leaving'), reduced ? 0 : 650)
      setTimeout(() => {
        open.update(list => list.filter(item => item.id !== id))
        logbook.update(list => [finished, ...list.filter(item => item.id !== id)])
        if (result.next) open.update(list => [...list, normalizeTodo(result.next as unknown as Record<string, unknown>)])
        setFade(id, null)
        if (workspace().route().item === id) workspace().openItem(null)
        void workspace().reloadSidebar()
      }, reduced ? 80 : 950)
    }
    catch (cause) { setFade(id, null); workspace().fail(cause, 'Could not complete the to-do.') }
  }

  /** Put a finished to-do back in its list. */
  async function reopen(id: number): Promise<void> {
    const todo = logbook().find(item => item.id === id)
    if (!todo) return
    try {
      const result = await api.reopenTodo(id)
      const back = normalizeTodo({ ...(result.todo as unknown as Record<string, unknown>), checklist: todo.checklist })
      logbook.update(list => list.filter(item => item.id !== id))
      open.update(list => [...list, back])
      void workspace().reloadSidebar()
      workspace().say('Moved back to your lists')
    }
    catch (cause) { workspace().fail(cause, 'Could not reopen the to-do.') }
  }

  const toggle = (todo: Todo): Promise<void> => todo.completed_at ? reopen(todo.id) : complete(todo.id)

  // Ordering

  /** Drop `dragged` next to `target` inside `group`; rows whose position changed are written. */
  function reorder(group: Todo[], dragged: number, target: number, after: boolean): void {
    if (dragged === target) return
    const ids = group.map(todo => todo.id)
    const without = ids.filter(id => id !== dragged)
    const at = without.indexOf(target)
    if (at < 0 || !ids.includes(dragged)) return
    const order = moveId(ids, dragged, at + (after ? 1 : 0))
    for (const change of orderChanges(group, order)) update(change.id, { sort_order: change.sort_order }, 250)
  }

  /** Alt+arrow: move the open row one place. */
  function nudge(group: Todo[], id: number, by: -1 | 1): void {
    const index = group.findIndex(todo => todo.id === id)
    const to = index + by
    if (index < 0 || to < 0 || to >= group.length) return
    const order = moveId(group.map(todo => todo.id), id, to)
    for (const change of orderChanges(group, order)) update(change.id, { sort_order: change.sort_order }, 250)
  }

  // Checklist

  const withChecklist = (todoId: number, change: (list: ChecklistItem[]) => ChecklistItem[]): void => {
    const todo = find(todoId)
    if (todo) replace({ ...todo, checklist: change(todo.checklist) })
  }

  async function addCheck(todoId: number, title: string): Promise<void> {
    const name = title.trim()
    if (!name) return
    try {
      const item = normalizeItem(await api.createChecklistItem(todoId, name) as unknown as Record<string, unknown>)
      const last = Math.max(0, ...(find(todoId)?.checklist ?? []).map(entry => entry.sort_order))
      withChecklist(todoId, list => [...list, item])
      if (item.sort_order <= last) await setCheck(todoId, item.id, { sort_order: last + 1 })
    }
    catch (cause) { workspace().fail(cause, 'Could not add the checklist item.') }
  }

  async function setCheck(todoId: number, id: number, changes: Partial<ChecklistItem>): Promise<void> {
    withChecklist(todoId, list => list.map(item => item.id === id ? { ...item, ...changes } : item))
    try { await api.updateChecklistItem(id, changes) }
    catch (cause) { workspace().fail(cause, 'Could not save the checklist.'); await load() }
  }

  async function removeCheck(todoId: number, id: number): Promise<void> {
    withChecklist(todoId, list => list.filter(item => item.id !== id))
    try { await api.deleteChecklistItem(id) }
    catch (cause) { workspace().fail(cause, 'Could not remove the checklist item.'); await load() }
  }

  function moveCheck(todoId: number, id: number, by: -1 | 1): void {
    const list = find(todoId)?.checklist ?? []
    const index = list.findIndex(item => item.id === id)
    const to = index + by
    if (index < 0 || to < 0 || to >= list.length) return
    const order = moveId(list.map(item => item.id), id, to)
    // Checklist orders may all be equal on a fresh list, so renumber the whole list.
    order.forEach((itemId, position) => {
      if (list.find(item => item.id === itemId)?.sort_order !== position + 1) void setCheck(todoId, itemId, { sort_order: position + 1 })
    })
    withChecklist(todoId, entries => [...entries].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)))
  }

  // Keyboard

  /** Move the cursor through `group` by one row. */
  function step(group: Todo[], by: -1 | 1): void {
    if (!group.length) return
    const index = group.findIndex(todo => todo.id === cursor())
    const next = index < 0 ? (by === 1 ? 0 : group.length - 1) : Math.max(0, Math.min(group.length - 1, index + by))
    cursor.set(group[next]!.id)
  }

  return {
    open, logbook, loaded, today, fading, cursor, quickTitle, items, logItems, split, totals, tags, canAdd, selected,
    openCount, doneCount, ring, areaCount, load, refreshDay, find, create, quickAdd, update, flushAll, remove, complete, reopen, toggle,
    reorder, nudge, addCheck, setCheck, removeCheck, moveCheck, step, byOrder,
  }
})
