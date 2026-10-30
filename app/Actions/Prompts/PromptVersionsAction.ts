import { libraryRole } from '../../Support/sharing'
import { idParam, signedIn } from '../../Support/session'

/** The saved revisions of a prompt, newest first, with who wrote each. */
export default new Action({
  name: 'PromptVersions',
  description: 'Version history of a prompt',
  method: 'GET',
  async handle(request) {
    const who = await signedIn(request)
    if ('error' in who) return who.error
    const id = idParam(request)
    const prompt = id ? await Prompt.find(id) : undefined
    const access = prompt ? await libraryRole(Number(prompt.prompt_library_id), who.user) : null
    if (!prompt || !access) return response.json({ error: 'Prompt not found' }, 404)
    const versions = await PromptVersion.where('promptId', Number(prompt.id)).orderByDesc('version').get()
    const authors = versions.length ? await User.whereIn('id', [...new Set(versions.map(v => Number(v.user_id)))]).get() : []
    const names = new Map(authors.map(a => [Number(a.id), a.name]))
    return response.json({ versions: versions.map(v => ({ ...v.toJSON(), author: names.get(Number(v.user_id)) ?? '' })) })
  },
})
