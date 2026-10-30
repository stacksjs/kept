import { idParam, signedIn } from '../../Support/session'

const DAYS_KEPT = 30

/** The notes I deleted in the last 30 days, newest first. */
export default new Action({
  name: 'NoteTrash',
  description: 'Recently deleted notes',
  method: 'GET',
  async handle(request) {
    const who = await signedIn(request)
    if ('error' in who) return who.error
    const since = new Date(Date.now() - DAYS_KEPT * 864e5).toISOString().slice(0, 19).replace('T', ' ')
    const rows = await Note.onlyTrashed().where('userId', who.user.id).where('deletedAt', '>=', since).orderByDesc('deletedAt').limit(500).get()
    return response.json({ notes: rows.map(note => note.toJSON()), days: DAYS_KEPT })
  },
})
