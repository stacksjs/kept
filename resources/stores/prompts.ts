import { defineStore, derived, state, useStore } from '@stacksjs/stx'
import { fillPrompt, promptVariables } from '../../app/Support/prompts'
import { api, copyText, origin } from '../functions/kept/client'
import { filledSegments, filterPrompts, normalizePrompt, publicLinkUrl } from '../functions/kept/promptview'
import type { Library, Prompt, PromptVersion, Share } from '../functions/kept/types'

export interface Draft { id: number, title: string, description: string, body: string, model: string, tags: string[], favorite: boolean }

const toDraft = (prompt: Prompt): Draft => ({ id: prompt.id, title: prompt.title, description: prompt.description, body: prompt.body, model: prompt.model, tags: [...prompt.tags], favorite: prompt.favorite })

/**
 * Prompt libraries: the library list, the prompts in the open library, the
 * editor draft, and the sheets (Use, Versions, Share) that open over it.
 */
defineStore('prompts', () => {
  const prompts = state<Prompt[]>([])
  const role = state<'owner' | 'editor' | 'viewer'>('owner')
  const loadedFor = state<number | null>(null)
  const search = state('')
  const favoritesOnly = state(false)
  const draft = state<Draft | null>(null)
  const dirty = state(false)
  const saving = state(false)

  const useOpen = state(false)
  const values = state<Record<string, string>>({})
  const copied = state(false)
  const versionsOpen = state(false)
  const versions = state<PromptVersion[]>([])
  const shareOpen = state(false)
  const people = state<Share[]>([])
  const link = state<string | null>(null)
  const sharing = state(false)

  const workspace = (): any => useStore('workspace')
  const libraryId = derived<number | null>(() => {
    const route = workspace().route()
    return route.section === 'prompts' ? route.library : null
  })
  const library = derived<(Library & { shared?: boolean }) | null>(() => {
    const id = libraryId()
    if (!id) return null
    const { owned, shared } = workspace().libraries()
    return owned.find((item: Library) => item.id === id) ?? (shared as Library[]).map(item => ({ ...item, shared: true })).find(item => item.id === id) ?? null
  })
  const canEdit = derived(() => role() !== 'viewer')
  const isOwner = derived(() => role() === 'owner')
  const visible = derived(() => filterPrompts(prompts(), search(), favoritesOnly()))
  const selected = derived<Prompt | null>(() => {
    const route = workspace().route()
    const id = route.section === 'prompts' ? route.item : null
    return id ? prompts().find(prompt => prompt.id === id) ?? null : null
  })
  const variables = derived(() => promptVariables(draft()?.body ?? selected()?.body ?? ''))
  const filled = derived(() => fillPrompt(draft()?.body ?? selected()?.body ?? '', values()))
  const filledParts = derived(() => filledSegments(draft()?.body ?? selected()?.body ?? '', values()))
  const linkUrl = derived(() => link() ? publicLinkUrl(origin(), link()!) : '')
  const countFor = (id: number): number => workspace().libraries().owned.find((item: Library) => item.id === id)?.prompts ?? prompts().length

  async function load(id: number | null): Promise<void> {
    loadedFor.set(id)
    if (!id) { prompts.set([]); return }
    try {
      const result = await api.prompts(id)
      if (loadedFor() !== id) return
      prompts.set(result.prompts.map(row => normalizePrompt(row as unknown as Record<string, unknown>)))
      role.set((result.role as 'owner' | 'editor' | 'viewer') ?? 'owner')
      syncDraft()
    }
    catch (cause) { workspace().fail(cause, 'Could not load the prompts.') }
  }

  /** Make the editor draft match the open prompt (called when the route's item changes). */
  function syncDraft(): void {
    const prompt = selected()
    if (!prompt) { draft.set(null); dirty.set(false); return }
    if (draft()?.id === prompt.id) return
    draft.set(toDraft(prompt))
    dirty.set(false)
  }

  function change(patch: Partial<Draft>): void {
    const current = draft()
    if (!current || !canEdit()) return
    draft.set({ ...current, ...patch })
    dirty.set(true)
  }

  async function save(): Promise<Prompt | null> {
    const current = draft()
    if (!current || !dirty() || !canEdit()) return null
    if (!current.title.trim()) { workspace().say('A prompt needs a title.', 'error'); return null }
    saving.set(true)
    try {
      const saved = normalizePrompt(await api.savePrompt({ ...current, library_id: libraryId() ?? undefined }) as unknown as Record<string, unknown>)
      prompts.update(list => list.map(prompt => prompt.id === saved.id ? saved : prompt))
      draft.set(toDraft(saved))
      dirty.set(false)
      workspace().say('Saved')
      return saved
    }
    catch (cause) { workspace().fail(cause, 'Could not save the prompt.'); return null }
    finally { saving.set(false) }
  }

  async function open(id: number): Promise<void> {
    if (dirty()) await save()
    workspace().openItem(id)
    syncDraft()
  }

  async function close(): Promise<void> {
    if (dirty()) await save()
    workspace().openItem(null)
    draft.set(null)
  }

  async function create(): Promise<void> {
    const id = libraryId()
    if (!id || !canEdit()) return
    if (dirty()) await save()
    try {
      const prompt = normalizePrompt(await api.savePrompt({ library_id: id, title: 'Untitled prompt', body: '', description: '', model: '', tags: [], favorite: false }) as unknown as Record<string, unknown>)
      prompts.update(list => [prompt, ...list])
      workspace().openItem(prompt.id)
      draft.set(toDraft(prompt))
      dirty.set(false)
      void workspace().reloadSidebar()
    }
    catch (cause) { workspace().fail(cause, 'Could not create the prompt.') }
  }

  async function remove(id: number): Promise<void> {
    prompts.update(list => list.filter(prompt => prompt.id !== id))
    if (draft()?.id === id) { draft.set(null); dirty.set(false) }
    if (workspace().route().item === id) workspace().openItem(null)
    try { await api.deletePrompt(id); void workspace().reloadSidebar() }
    catch (cause) { workspace().fail(cause, 'Could not delete the prompt.'); await load(libraryId()) }
  }

  async function toggleFavorite(id: number): Promise<void> {
    const prompt = prompts().find(item => item.id === id)
    if (!prompt || !canEdit()) return
    const favorite = !prompt.favorite
    prompts.update(list => list.map(item => item.id === id ? { ...item, favorite } : item))
    if (draft()?.id === id) draft.set({ ...draft()!, favorite })
    try {
      // The save replaces the whole prompt, so send it as it is on the server, not the unsaved draft.
      await api.savePrompt({ id, title: prompt.title, description: prompt.description, body: prompt.body, model: prompt.model, tags: prompt.tags, favorite })
    }
    catch (cause) { workspace().fail(cause, 'Could not update the favorite.'); await load(libraryId()) }
  }

  // Use sheet

  function startUse(): void {
    if (!draft() && !selected()) return
    values.set({})
    copied.set(false)
    useOpen.set(true)
  }

  function setValue(name: string, value: string): void {
    values.update(map => ({ ...map, [name]: value }))
    copied.set(false)
  }

  async function copyFilled(): Promise<void> {
    const ok = await copyText(filled())
    if (!ok) { workspace().say('Your browser blocked copying. Select the text and copy it.', 'error'); return }
    copied.set(true)
    const id = draft()?.id ?? selected()?.id
    if (id) {
      try {
        const result = await api.usePrompt(id)
        prompts.update(list => list.map(prompt => prompt.id === id ? { ...prompt, uses: result.uses } : prompt))
      }
      catch { /* the copy worked; the counter is a nicety */ }
    }
  }

  // Versions

  async function showVersions(): Promise<void> {
    const id = draft()?.id ?? selected()?.id
    if (!id) return
    versions.set([])
    versionsOpen.set(true)
    try { versions.set((await api.promptVersions(id)).versions) }
    catch (cause) { workspace().fail(cause, 'Could not load the history.') }
  }

  /** Restoring saves the old text as a new version, so nothing in the history is lost. */
  async function restore(version: PromptVersion): Promise<void> {
    const current = draft()
    if (!current || !canEdit()) return
    draft.set({ ...current, title: version.title, body: version.body })
    dirty.set(true)
    const saved = await save()
    if (saved) {
      versionsOpen.set(false)
      workspace().say(`Restored version ${version.version}`)
    }
  }

  // Sharing

  async function showShare(): Promise<void> {
    const id = libraryId()
    if (!id || !isOwner()) return
    shareOpen.set(true)
    try {
      const result = await api.shares(id)
      people.set(result.people)
      link.set(result.link?.token ?? null)
    }
    catch (cause) { workspace().fail(cause, 'Could not load sharing.') }
  }

  async function invite(email: string, shareRole: 'viewer' | 'editor'): Promise<boolean> {
    const id = libraryId()
    const address = email.trim()
    if (!id || !address) return false
    sharing.set(true)
    try {
      await api.share(id, address, shareRole)
      people.set((await api.shares(id)).people)
      return true
    }
    catch (cause) { workspace().fail(cause, 'Could not share with that person.'); return false }
    finally { sharing.set(false) }
  }

  async function changeRole(person: Share, shareRole: 'viewer' | 'editor'): Promise<void> {
    const id = libraryId()
    if (!id || person.role === shareRole) return
    people.update(list => list.map(item => item.id === person.id ? { ...item, role: shareRole } : item))
    try { await api.share(id, person.email, shareRole); people.set((await api.shares(id)).people) }
    catch (cause) { workspace().fail(cause, 'Could not change that role.') }
  }

  async function uninvite(person: Share): Promise<void> {
    people.update(list => list.filter(item => item.id !== person.id))
    try { await api.unshare(person.id) }
    catch (cause) { workspace().fail(cause, 'Could not remove that person.'); await showShare() }
  }

  async function setLink(on: boolean): Promise<void> {
    const id = libraryId()
    if (!id) return
    try {
      const result = await api.setLink(id, on)
      link.set(result.link?.token ?? null)
      void workspace().reloadSidebar()
    }
    catch (cause) { workspace().fail(cause, 'Could not change the link.') }
  }

  async function copyLink(): Promise<void> {
    if (await copyText(linkUrl())) workspace().say('Link copied')
    else workspace().say('Your browser blocked copying. Select the link and copy it.', 'error')
  }

  // Library details

  async function saveLibrary(changes: Record<string, unknown>): Promise<void> {
    const id = libraryId()
    if (!id) return
    try { await api.updateLibrary(id, changes); await workspace().reloadSidebar() }
    catch (cause) { workspace().fail(cause, 'Could not update the library.') }
  }

  async function removeLibrary(): Promise<void> {
    const id = libraryId()
    if (!id) return
    try {
      await api.deleteLibrary(id)
      workspace().go({ section: 'prompts', library: null, item: null })
      await workspace().reloadSidebar()
    }
    catch (cause) { workspace().fail(cause, 'Could not delete the library.') }
  }

  return {
    prompts, role, loadedFor, search, favoritesOnly, draft, dirty, saving, useOpen, values, copied, versionsOpen, versions,
    shareOpen, people, link, sharing, libraryId, library, canEdit, isOwner, visible, selected, variables, filled, filledParts, linkUrl,
    countFor, load, syncDraft, change, save, open, close, create, remove, toggleFavorite, startUse, setValue, copyFilled,
    showVersions, restore, showShare, invite, changeRole, uninvite, setLink, copyLink, saveLibrary, removeLibrary,
  }
})
