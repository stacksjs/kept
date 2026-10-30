import { libraryRole } from '../../Support/sharing'
import { idParam, signedIn } from '../../Support/session'

/** Who a library is shared with, and whether its read-only link is on. Owners only. */
export default new Action({
  name: 'LibraryShares',
  description: 'People a prompt library is shared with',
  method: 'GET',
  async handle(request) {
    const who = await signedIn(request)
    if ('error' in who) return who.error
    const id = idParam(request)
    const access = id ? await libraryRole(id, who.user) : null
    if (!access) return response.json({ error: 'Library not found' }, 404)
    if (access.role !== 'owner') return response.json({ error: 'Only the owner manages sharing' }, 403)
    const shares = await Share.where('resourceType', 'library').where('resourceId', id!).get()
    const people = shares.some(s => s.shared_with_user_id) ? await User.whereIn('id', shares.filter(s => s.shared_with_user_id).map(s => Number(s.shared_with_user_id))).get() : []
    const names = new Map(people.map(p => [Number(p.id), { name: p.name, email: p.email }]))
    return response.json({
      link: access.library.share_token ? { token: access.library.share_token } : null,
      people: shares.map(s => ({
        id: s.id, role: s.role, accepted: Boolean(s.accepted_at),
        email: s.email || names.get(Number(s.shared_with_user_id))?.email || '',
        name: names.get(Number(s.shared_with_user_id))?.name ?? '',
      })),
    })
  },
})
