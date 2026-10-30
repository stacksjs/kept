import { defineStore, derived, state, useStore } from '@stacksjs/stx'
import { noteTitleAndSnippet } from '../../app/Support/notes'
import { api } from '../functions/kept/client'
import { filterNotes, findLinked, groupNotes, matchSnippet, normalizeNote, sortNotes, tagCounts, type NoteSort } from '../functions/kept/notes'
import type { NoteFolderKey } from '../functions/kept/router'
import type { Note } from '../functions/kept/types'

/**
 * Notes: the list, the search, and the editor's autosave. The server derives
 * the title and preview from the body; the same pure rule runs here so the
 * list updates as you type instead of after the save lands.
 */
const WINDOW = 40

defineStore('notes', () => {
  const items = state<Note[]>([])
  const loaded = state(false)
  const search = state('')
  const saving = state<'idle' | 'saving' | 'saved' | 'error'>('idle')
  /** Notes deleted in the last `trashDays` days, kept by the server. */
  const trashed = state<Note[]>([])
  const trashDays = state(30)
  const sort = state<NoteSort>('edited')
  const limit = state(WINDOW)

  const workspace = (): any => useStore('workspace')
  const folder = derived<NoteFolderKey>(() => {
    const route = workspace().route()
    return route.section === 'notes' ? route.folder : 'all'
  })
  const inTrash = derived(() => folder() === 'trash')
  const visible = derived(() => (inTrash() ? filterNotes(trashed(), 'all', search()) : filterNotes(items(), folder(), search())))
  const hasMore = derived(() => visible().length > limit())
  const sections = derived(() => groupNotes(sortNotes(visible(), sort()).slice(0, limit()), sort()))
  const selected = derived<Note | null>(() => {
    const route = workspace().route()
    const id = route.section === 'notes' ? route.item : null
    if (!id) return null
    return (inTrash() ? trashed() : items()).find(note => note.id === id) ?? null
  })
  const tagList = derived(() => tagCounts(items()))
  const more = (): void => { if (hasMore()) limit.update(n => n + WINDOW) }
  const resetWindow = (): void => { limit.set(WINDOW) }
  const searching = derived(() => search().trim().length > 0)
  const snippetFor = (note: Note): string => matchSnippet(note, search())

  async function load(): Promise<void> {
    try {
      const [rows, gone] = await Promise.all([api.notes(), api.notesTrash()])
      items.set(rows.map(row => normalizeNote(row as unknown as Record<string, unknown>)))
      trashed.set(gone.notes.map(row => normalizeNote(row as unknown as Record<string, unknown>)))
      trashDays.set(gone.days)
      loaded.set(true)
    }
    catch (cause) { workspace().fail(cause, 'Could not load your notes.') }
  }

  const replace = (note: Note): void => items.update(list => list.map(item => item.id === note.id ? note : item))

  // Autosave: one write per pause in typing.
  let timer: ReturnType<typeof setTimeout> | undefined
  let dirty: number | null = null

  async function flush(): Promise<void> {
    clearTimeout(timer)
    const id = dirty
    dirty = null
    if (id === null) return
    const note = items().find(item => item.id === id)
    if (!note) return
    saving.set('saving')
    try {
      const saved = normalizeNote(await api.saveNote({ id, body: note.body, pinned: note.pinned, note_folder_id: note.note_folder_id }) as unknown as Record<string, unknown>)
      // Keep what is on screen: typing may have moved on while this save was in flight.
      const current = items().find(item => item.id === id)
      replace({ ...saved, body: current?.body ?? saved.body })
      saving.set(dirty === null ? 'saved' : 'saving')
    }
    catch (cause) { saving.set('error'); workspace().fail(cause, 'Could not save the note. Your text is still here.') }
  }

  /** Called on every keystroke with the whole body. */
  function edit(id: number, body: string): void {
    const note = items().find(item => item.id === id)
    if (!note || note.body === body) return
    replace({ ...note, body, ...noteTitleAndSnippet(body), updated_at: new Date().toISOString() })
    dirty = id
    saving.set('saving')
    clearTimeout(timer)
    timer = setTimeout(() => void flush(), 600)
  }

  /** Notes.app drops a note you opened and left empty. */
  async function leave(id: number | null): Promise<void> {
    await flush()
    if (id === null) return
    const note = items().find(item => item.id === id)
    if (note && !note.body.trim()) await remove(id, true)
  }

  async function create(): Promise<void> {
    await flush()
    const current = workspace().route()
    const inFolder = current.section === 'notes' && typeof current.folder === 'number' ? current.folder : null
    search.set('')
    if (current.section === 'notes' && (current.folder === 'trash' || typeof current.folder === 'string' && current.folder.startsWith('tag:'))) workspace().go({ section: 'notes', folder: 'all', item: null })
    try {
      const note = normalizeNote(await api.saveNote({ body: '', note_folder_id: inFolder }) as unknown as Record<string, unknown>)
      items.update(list => [note, ...list])
      workspace().go({ section: 'notes', folder: current.section === 'notes' && (typeof current.folder === 'number') ? current.folder : 'all', item: note.id })
      saving.set('idle')
    }
    catch (cause) { workspace().fail(cause, 'Could not create the note.') }
  }

  async function open(id: number): Promise<void> {
    const previous = selected()?.id ?? null
    if (previous !== id) await leave(previous)
    workspace().openItem(id)
  }

  async function close(): Promise<void> {
    const previous = selected()?.id ?? null
    await leave(previous)
    workspace().openItem(null)
    void workspace().reloadSidebar()
  }

  async function remove(id: number, quiet = false): Promise<void> {
    if (dirty === id) { dirty = null; clearTimeout(timer) }
    const gone = items().find(note => note.id === id)
    if (gone?.body.trim()) trashed.update(list => [{ ...gone, deleted_at: new Date().toISOString() } as Note, ...list])
    items.update(list => list.filter(note => note.id !== id))
    if (workspace().route().item === id && workspace().route().section === 'notes') workspace().openItem(null)
    try {
      await api.deleteNote(id)
      // A note nobody wrote in is not worth keeping for 30 days.
      if (!gone?.body.trim()) await api.purgeNote(id)
      void workspace().reloadSidebar()
    }
    catch (cause) { if (!quiet) workspace().fail(cause, 'Could not delete the note.'); await load() }
  }

  async function pin(id: number): Promise<void> {
    const note = items().find(item => item.id === id)
    if (!note) return
    replace({ ...note, pinned: !note.pinned })
    dirty = id
    await flush()
  }

  async function move(id: number, folderId: number | null): Promise<void> {
    const note = items().find(item => item.id === id)
    if (!note) return
    replace({ ...note, note_folder_id: folderId })
    dirty = id
    await flush()
    void workspace().reloadSidebar()
  }

  /** Put a deleted note back in the folder it came from. */
  async function restore(id: number): Promise<void> {
    try {
      const saved = normalizeNote(await api.restoreNote(id) as unknown as Record<string, unknown>)
      trashed.update(list => list.filter(note => note.id !== id))
      items.update(list => [saved, ...list.filter(note => note.id !== id)])
      workspace().go({ section: 'notes', folder: 'all', item: saved.id })
      void workspace().reloadSidebar()
      workspace().say('Note restored')
    }
    catch (cause) { workspace().fail(cause, 'Could not restore the note.') }
  }

  async function deleteForever(id: number): Promise<void> {
    trashed.update(list => list.filter(note => note.id !== id))
    if (workspace().route().item === id) workspace().openItem(null)
    try { await api.purgeNote(id) }
    catch (cause) { workspace().fail(cause, 'Could not delete the note for good.'); await load() }
  }

  /** Delete every note in Recently deleted for good. */
  async function emptyTrash(): Promise<void> {
    const ids = trashed().map(note => note.id)
    trashed.set([])
    workspace().openItem(null)
    try { await Promise.all(ids.map(id => api.purgeNote(id))) }
    catch (cause) { workspace().fail(cause, 'Could not empty Recently deleted.'); await load() }
  }

  /** Follow a `[[Title]]` link. */
  async function openLink(title: string): Promise<void> {
    const target = findLinked(items(), title)
    if (!target) { workspace().say(`No note called "${title.slice(0, 40)}".`, 'error'); return }
    await flush()
    workspace().go({ section: 'notes', folder: 'all', item: target.id })
  }

  /** Show every note with a `#tag`. */
  function openTag(name: string): void { workspace().go({ section: 'notes', folder: `tag:${name}`, item: null }) }

  return { items, loaded, search, saving, trashed, trashDays, sort, inTrash, folder, visible, sections, selected, searching, tagList, hasMore, more, resetWindow, snippetFor, load, edit, flush, create, open, close, remove, restore, deleteForever, emptyTrash, openLink, openTag, pin, move }
})
