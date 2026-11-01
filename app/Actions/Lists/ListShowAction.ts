import { dayOrToday } from '../../Support/dates'
import { inList, isSmartList } from '../../Support/lists'
import { parseTags, signedIn } from '../../Support/session'

/** One smart list (Inbox, Today, Upcoming, Anytime, Someday, Logbook), with checklist progress. */
export default new Action({
  name: 'ShowList',
  description: 'The to-dos in one smart list',
  method: 'GET',
  async handle(request) {
    const who = await signedIn(request)
    if ('error' in who) return who.error
    const list = String(request.getParam('list') ?? '')
    if (!isSmartList(list)) return response.json({ error: 'Unknown list' }, 404)
    const today = dayOrToday(request.get('today'))

    const rows = list === 'logbook'
      ? await Todo.where('user_id', who.user.id).orderByDesc('updated_at').limit(500).get()
      : await Todo.where('user_id', who.user.id).whereNull('completedAt').whereNull('canceledAt').get()
    const todos = inList(rows.map(row => row.toJSON()), list, today)
    if (list !== 'upcoming' && list !== 'logbook') todos.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)

    const ids = todos.map(todo => todo.id)
    const checklist = ids.length ? await ChecklistItem.whereIn('todo_id', ids).orderBy('sortOrder').get() : []
    const items = new Map<number, Array<Record<string, unknown>>>()
    for (const item of checklist.map(row => row.toJSON())) items.set(item.todo_id, [...(items.get(item.todo_id) ?? []), item])

    return response.json({
      list,
      today,
      todos: todos.map(todo => ({ ...todo, tags: parseTags(todo.tags), checklist: items.get(todo.id) ?? [] })),
    })
  },
})
