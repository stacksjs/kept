import { libraryRole } from '../../Support/sharing'
import { idParam, signedIn } from '../../Support/session'

/**
 * Create or edit a prompt in a library I own or may edit. A changed title or
 * body leaves the previous text behind as a version, so a teammate's edit can
 * be compared and restored.
 */
export default new Action({
  name: 'SavePrompt',
  description: 'Create or update a prompt, keeping a version history',
  method: 'POST',
  async handle(request) {
    const who = await signedIn(request)
    if ('error' in who) return who.error
    const id = idParam(request)
    const fields = {
      title: String(request.get('title') ?? '').trim().slice(0, 300),
      description: String(request.get('description') ?? '').slice(0, 2000),
      body: String(request.get('body') ?? '').slice(0, 100000),
      model: String(request.get('model') ?? '').slice(0, 100),
      tags: JSON.stringify(Array.isArray(request.get('tags')) ? (request.get('tags') as unknown[]).map(String).slice(0, 20) : []),
      favorite: Boolean(request.get('favorite')),
    }
    if (!fields.title) return response.json({ error: 'A prompt needs a title' }, 422)

    if (!id) {
      const access = await libraryRole(Number(request.get('library_id')), who.user)
      if (!access || access.role === 'viewer') return response.json({ error: 'Library not found' }, access ? 403 : 404)
      const prompt = await Prompt.create({ ...fields, promptLibraryId: Number(access.library.id), userId: who.user.id })
      await PromptVersion.create({ promptId: prompt.id, version: 1, title: fields.title, body: fields.body, userId: who.user.id })
      return response.json({ prompt: prompt.toJSON() }, 201)
    }

    const prompt = await Prompt.find(id)
    const access = prompt ? await libraryRole(Number(prompt.prompt_library_id), who.user) : null
    if (!prompt || !access) return response.json({ error: 'Prompt not found' }, 404)
    if (access.role === 'viewer') return response.json({ error: 'You can view this library but not edit it' }, 403)

    const changed = prompt.title !== fields.title || prompt.body !== fields.body
    const version = changed ? Number(prompt.version ?? 1) + 1 : Number(prompt.version ?? 1)
    await prompt.update({ ...fields, version })
    if (changed) await PromptVersion.create({ promptId: prompt.id, version, title: fields.title, body: fields.body, userId: who.user.id })
    return response.json({ prompt: prompt.toJSON() })
  },
})
