import { libraryRole } from '../../Support/sharing'
import { idParam, signedIn } from '../../Support/session'

/**
 * Share a library with someone by email. If they already have an account it
 * appears in their "Shared with me" at once; otherwise it waits for the first
 * time they sign in with that address.
 */
export default new Action({
  name: 'ShareLibrary',
  description: 'Share a prompt library with a person',
  method: 'POST',
  async handle(request) {
    const who = await signedIn(request)
    if ('error' in who) return who.error
    const id = idParam(request)
    const access = id ? await libraryRole(id, who.user) : null
    if (!access) return response.json({ error: 'Library not found' }, 404)
    if (access.role !== 'owner') return response.json({ error: 'Only the owner manages sharing' }, 403)

    const email = String(request.get('email') ?? '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) return response.json({ error: 'Enter a valid email address' }, 422)
    if (email === who.user.email.toLowerCase()) return response.json({ error: 'This library is already yours' }, 422)
    const role = request.get('role') === 'editor' ? 'editor' : 'viewer'

    const existing = await Share.where('resourceType', 'library').where('resourceId', id!).where('email', email).first()
    if (existing) {
      await existing.update({ role })
      return response.json({ share: existing.toJSON() })
    }
    const person = await User.where('email', email).first()
    const share = await Share.create({
      resourceType: 'library', resourceId: id!, email, role, userId: who.user.id,
      sharedWithUserId: person ? Number(person.id) : null,
      acceptedAt: person ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null,
    })
    return response.json({ share: share.toJSON(), joined: Boolean(person) }, 201)
  },
})
