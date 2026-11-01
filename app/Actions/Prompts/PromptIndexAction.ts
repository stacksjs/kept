import { claimPendingShares, libraryRole } from '../../Support/sharing'
import { idParam, parseTags, signedIn } from '../../Support/session'
import { promptVariables } from '../../Support/prompts'

/** Prompts in one library, or across everything I can see when searching. */
export default new Action({
  name: 'Prompts',
  description: 'List or search prompts in a library',
  method: 'GET',
  async handle(request) {
    const who = await signedIn(request)
    if ('error' in who) return who.error
    await claimPendingShares(who.user)
    const search = String(request.get('search') ?? '').trim().toLowerCase()
    const libraryId = idParam(request)
    let libraryIds: number[]
    let role: string | undefined
    if (libraryId) {
      const access = await libraryRole(libraryId, who.user)
      if (!access) return response.json({ error: 'Library not found' }, 404)
      libraryIds = [libraryId]
      role = access.role
    }
    else {
      const owned = await PromptLibrary.where('user_id', who.user.id).get()
      const shares = await Share.where('resourceType', 'library').where('sharedWithUserId', who.user.id).get()
      libraryIds = [...owned.map(l => Number(l.id)), ...shares.map(s => Number(s.resource_id))]
    }
    const rows = libraryIds.length ? await Prompt.whereIn('prompt_library_id', libraryIds).orderByDesc('updated_at').get() : []
    const prompts = rows.map(p => p.toJSON()).filter((p) => {
      if (request.get('favorites') && !p.favorite) return false
      if (!search) return true
      return `${p.title} ${p.description} ${p.body} ${p.tags}`.toLowerCase().includes(search)
    })
    return response.json({ role, prompts: prompts.map(p => ({ ...p, tags: parseTags(p.tags), variables: promptVariables(String(p.body ?? '')) })) })
  },
})
