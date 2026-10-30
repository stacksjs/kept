import { parseTags } from '../../Support/session'
import { promptVariables } from '../../Support/prompts'

/** A library opened from its read-only link: no account needed, nothing editable, no one's email exposed. */
export default new Action({
  name: 'SharedLibrary',
  description: 'Read a prompt library through its public link',
  method: 'GET',
  async handle(request) {
    const token = String(request.getParam('token') ?? '')
    if (token.length < 16 || token.length > 128) return response.json({ error: 'Link not found' }, 404)
    const library = await PromptLibrary.where('shareToken', token).first()
    if (!library) return response.json({ error: 'Link not found' }, 404)
    const owner = await User.find(Number(library.user_id))
    const prompts = await Prompt.where('promptLibraryId', Number(library.id)).orderBy('title').get()
    return response.json({
      library: { title: library.title, description: library.description, icon: library.icon, color: library.color, owner: owner?.name ?? '' },
      prompts: prompts.map(p => ({ id: p.id, title: p.title, description: p.description, body: p.body, model: p.model, tags: parseTags(p.tags), variables: promptVariables(String(p.body ?? '')) })),
    })
  },
})
