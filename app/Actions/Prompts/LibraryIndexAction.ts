import { claimPendingShares } from '../../Support/sharing'
import { signedIn } from '../../Support/session'

/** My prompt libraries, and the ones other people shared with me. */
export default new Action({
  name: 'PromptLibraries',
  description: 'Prompt libraries I own and libraries shared with me',
  method: 'GET',
  async handle(request) {
    const who = await signedIn(request)
    if ('error' in who) return who.error
    await claimPendingShares(who.user)

    const owned = await PromptLibrary.where('user_id', who.user.id).orderBy('sortOrder').get()
    const shares = await Share.where('resourceType', 'library').where('sharedWithUserId', who.user.id).get()
    const sharedLibraries = shares.length ? await PromptLibrary.whereIn('id', shares.map(s => Number(s.resource_id))).get() : []
    const owners = sharedLibraries.length ? await User.whereIn('id', [...new Set(sharedLibraries.map(l => Number(l.user_id)))]).get() : []
    const roleOf = new Map(shares.map(s => [Number(s.resource_id), s.role]))
    const nameOf = new Map(owners.map(o => [Number(o.id), o.name]))

    const counts = new Map<number, number>()
    const everyId = [...owned, ...sharedLibraries].map(l => Number(l.id))
    for (const prompt of everyId.length ? await Prompt.whereIn('prompt_library_id', everyId).get() : [])
      counts.set(Number(prompt.prompt_library_id), (counts.get(Number(prompt.prompt_library_id)) ?? 0) + 1)

    return response.json({
      owned: owned.map(l => ({ ...l.toJSON(), prompts: counts.get(Number(l.id)) ?? 0, linked: Boolean(l.share_token) })),
      shared: sharedLibraries.map(l => ({ ...l.toJSON(), share_token: undefined, role: roleOf.get(Number(l.id)) ?? 'viewer', owner: nameOf.get(Number(l.user_id)) ?? '', prompts: counts.get(Number(l.id)) ?? 0 })),
    })
  },
})
