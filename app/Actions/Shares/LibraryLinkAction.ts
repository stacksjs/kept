import { newShareToken, libraryRole } from '../../Support/sharing'
import { idParam, signedIn } from '../../Support/session'

/** Turn the read-only link for a library on (POST) or off (DELETE). Anyone with the link can read, nobody can edit. */
export default new Action({
  name: 'LibraryLink',
  description: 'Create or revoke a library read-only link',
  method: 'POST',
  async handle(request) {
    const who = await signedIn(request)
    if ('error' in who) return who.error
    const id = idParam(request)
    const access = id ? await libraryRole(id, who.user) : null
    if (!access) return response.json({ error: 'Library not found' }, 404)
    if (access.role !== 'owner') return response.json({ error: 'Only the owner manages sharing' }, 403)
    const library = await PromptLibrary.find(id!)
    const revoke = String(request.get('revoke') ?? '') === '1' || String(request.get('_method') ?? '').toUpperCase() === 'DELETE'
    // The token is not a fillable attribute (a client must never choose its own), so it is written directly.
    const token = revoke ? null : (library!.share_token || newShareToken())
    await db.updateTable('prompt_libraries').set({ share_token: token }).where('id', '=', id!).execute()
    return response.json({ link: token ? { token } : null })
  },
})
