import { nextOccurrence, dayOrToday, type Repeat } from '../../Support/dates'
import { idParam, signedIn } from '../../Support/session'

/**
 * Check a to-do off. A repeating one leaves a finished copy in the Logbook and
 * comes back scheduled for its next date, as Things does.
 */
export default new Action({
  name: 'CompleteTodo',
  description: 'Complete a to-do, scheduling the next one when it repeats',
  method: 'POST',
  async handle(request) {
    const who = await signedIn(request)
    if ('error' in who) return who.error
    const id = idParam(request)
    const todo = id ? await Todo.where('id', id).where('user_id', who.user.id).first() : undefined
    if (!todo) return response.json({ error: 'To-do not found' }, 404)

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const repeat = String(todo.repeat ?? 'none') as Repeat
    const today = dayOrToday(request.get('today'))
    const next = nextOccurrence(String(todo.start_date ?? today) > today ? String(todo.start_date) : today, repeat)

    let spawned: Record<string, unknown> | null = null
    if (next && !todo.completed_at) {
      const copy = await Todo.create({
        title: todo.title, notes: todo.notes, when: 'anytime', startDate: next, deadline: null,
        tags: todo.tags, repeat, sortOrder: todo.sort_order, userId: who.user.id,
        areaId: todo.area_id, projectId: todo.project_id, headingId: todo.heading_id,
      })
      spawned = copy.toJSON()
    }
    await todo.update({ completedAt: now })
    return response.json({ todo: todo.toJSON(), next: spawned })
  },
})
