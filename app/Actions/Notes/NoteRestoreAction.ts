import { idParam, signedIn } from '../../Support/session'

/** Put a recently deleted note back. */
export default new Action({
  name: 'RestoreNote',
  description: 'Restore a deleted note',
  method: 'POST',
  async handle(request) {
    const who = await signedIn(request)
    if ('error' in who) return who.error
    const id = idParam(request)
    const note = id ? await Note.onlyTrashed().where('id', id).where('user_id', who.user.id).first() : undefined
    if (!note) return response.json({ error: 'Note not found in Recently Deleted' }, 404)
    await db.updateTable('notes').set({ deleted_at: null }).where('id', '=', Number(note.id)).execute()
    const restored = await Note.find(Number(note.id))
    return response.json({ note: restored?.toJSON() })
  },
})
