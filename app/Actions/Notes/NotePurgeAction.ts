import { idParam, signedIn } from '../../Support/session'

/** Delete a note for good, from Recently Deleted only. */
export default new Action({
  name: 'PurgeNote',
  description: 'Permanently delete a note that is already in Recently Deleted',
  method: 'DELETE',
  async handle(request) {
    const who = await signedIn(request)
    if ('error' in who) return who.error
    const id = idParam(request)
    const note = id ? await Note.onlyTrashed().where('id', id).where('user_id', who.user.id).first() : undefined
    if (!note) return response.json({ error: 'Note not found in Recently Deleted' }, 404)
    await db.deleteFrom('notes').where('id', '=', Number(note.id)).execute()
    return response.json({ purged: true })
  },
})
