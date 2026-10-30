import { libraryRole } from '../../Support/sharing'
import { idParam, signedIn } from '../../Support/session'

/** Count a copy or use of a prompt, so the library can sort by what the team really reaches for. */
export default new Action({
  name: 'UsePrompt',
  description: 'Record that a prompt was used',
  method: 'POST',
  async handle(request) {
    const who = await signedIn(request)
    if ('error' in who) return who.error
    const id = idParam(request)
    const prompt = id ? await Prompt.find(id) : undefined
    const access = prompt ? await libraryRole(Number(prompt.prompt_library_id), who.user) : null
    if (!prompt || !access) return response.json({ error: 'Prompt not found' }, 404)
    await prompt.update({ uses: Number(prompt.uses ?? 0) + 1 })
    return response.json({ uses: Number(prompt.uses) })
  },
})
