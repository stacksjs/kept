import { idParam, signedIn } from '../../Support/session'

/** Put a completed or canceled to-do back on its list. */
export default new Action({
  name: 'ReopenTodo',
  description: 'Reopen a completed or canceled to-do',
  method: 'POST',
  async handle(request) {
    const who = await signedIn(request)
    if ('error' in who) return who.error
    const id = idParam(request)
    const todo = id ? await Todo.where('id', id).where('userId', who.user.id).first() : undefined
    if (!todo) return response.json({ error: 'To-do not found' }, 404)
    await todo.update({ completedAt: null, canceledAt: null })
    return response.json({ todo: todo.toJSON() })
  },
})
