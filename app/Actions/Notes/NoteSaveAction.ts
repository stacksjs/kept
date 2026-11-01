import { noteTitleAndSnippet } from '../../Support/notes'
import { idParam, signedIn } from '../../Support/session'

/** Create or update a note. The title and preview come from the body, like Notes.app. */
export default new Action({
  name: 'SaveNote',
  description: 'Create or update a note',
  method: 'POST',
  async handle(request) {
    const who = await signedIn(request)
    if ('error' in who) return who.error
    const body = String(request.get('body') ?? '').slice(0, 200000)
    const { title, snippet } = noteTitleAndSnippet(body)
    const folderId = request.get('note_folder_id') ? Number(request.get('note_folder_id')) : null
    if (folderId && !await NoteFolder.where('id', folderId).where('user_id', who.user.id).first())
      return response.json({ error: 'Folder not found' }, 404)

    const id = idParam(request)
    if (!id) {
      const note = await Note.create({ body, title, snippet, pinned: Boolean(request.get('pinned')), noteFolderId: folderId, userId: who.user.id })
      return response.json({ note: note.toJSON() }, 201)
    }
    const note = await Note.where('id', id).where('user_id', who.user.id).first()
    if (!note) return response.json({ error: 'Note not found' }, 404)
    const changes: Record<string, unknown> = { body, title, snippet }
    if (request.get('pinned') !== undefined) changes.pinned = Boolean(request.get('pinned'))
    if (request.get('note_folder_id') !== undefined) changes.noteFolderId = folderId
    await note.update(changes)
    return response.json({ note: note.toJSON() })
  },
})
