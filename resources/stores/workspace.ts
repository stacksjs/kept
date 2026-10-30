import { defineStore, derived, state, useStore } from '@stacksjs/stx'
import { api } from '../functions/kept/client'
import { formatRoute, HOME, panelFor, parentOf, parseRoute, type Route, withItem } from '../functions/kept/router'
import type { Area, LibraryList, NoteFolder, Project, SidebarData } from '../functions/kept/types'
import type { View } from '../functions/kept/todos'

export interface Toast { id: number, text: string, tone: 'info' | 'error' }

/**
 * Where the app is (the URL hash), the sidebar's data (areas, projects, note
 * folders, libraries) and the small things every pane shares: toasts and the
 * one confirm sheet. The to-dos, notes and prompts live in their own stores.
 */
defineStore('workspace', () => {
  const route = state<Route>(HOME)
  const sidebar = state<SidebarData | null>(null)
  const libraries = state<LibraryList>({ owned: [], shared: [] })
  const loaded = state(false)
  const toasts = state<Toast[]>([])
  const confirmation = state<{ title: string, message: string, label: string, run: () => void } | null>(null)
  let toastId = 0

  const section = derived(() => route().section)
  const panel = derived(() => panelFor(route()))
  const areas = derived<Area[]>(() => sidebar()?.areas ?? [])
  const projects = derived<Project[]>(() => sidebar()?.projects ?? [])
  const folders = derived<NoteFolder[]>(() => sidebar()?.note_folders ?? [])
  /** The to-do view the route names, or Inbox when the route is somewhere else. */
  const view = derived<View>(() => {
    const r = route()
    return r.section === 'todos' ? r.view : { kind: 'list', name: 'inbox' }
  })

  function say(text: string, tone: Toast['tone'] = 'info'): void {
    const id = ++toastId
    toasts.update(list => [...list.slice(-2), { id, text, tone }])
    setTimeout(() => toasts.update(list => list.filter(toast => toast.id !== id)), tone === 'error' ? 6000 : 3200)
  }
  const fail = (cause: unknown, fallback: string): void => say(cause instanceof Error && cause.message ? cause.message : fallback, 'error')

  function readHash(): void {
    const next = parseRoute(globalThis.location?.hash ?? '')
    // A wide window has no "home" pane: it opens on the Inbox.
    route.set(next)
  }

  function go(next: Route): void {
    const hash = formatRoute(next)
    route.set(next)
    if (globalThis.location && globalThis.location.hash !== hash) globalThis.location.hash = hash
  }

  /** Open a to-do view, a notes folder or a library. */
  const open = (next: Route): void => go(next)
  const openItem = (id: number | null): void => go(withItem(route(), id))
  const back = (): void => go(parentOf(route()))

  async function loadSidebar(): Promise<void> {
    const [side, libs] = await Promise.all([api.sidebar(useStore('tasks').today()), api.libraries()])
    sidebar.set(side)
    libraries.set(libs)
    loaded.set(true)
  }

  async function init(): Promise<void> {
    readHash()
    globalThis.addEventListener?.('hashchange', readHash)
    try { await loadSidebar() }
    catch (cause) { fail(cause, 'Could not load your lists.') }
  }

  /** Reload only what changed, so a rename shows up without refetching the world. */
  async function reloadSidebar(): Promise<void> {
    try { await loadSidebar() }
    catch (cause) { fail(cause, 'Could not refresh the sidebar.') }
  }

  // Areas and projects

  async function createArea(title: string): Promise<Area | null> {
    const name = title.trim()
    if (!name) return null
    try {
      const area = await api.createArea(name)
      await reloadSidebar()
      return area
    }
    catch (cause) { fail(cause, 'Could not create the area.'); return null }
  }

  async function createProject(title: string, areaId: number | null = null): Promise<Project | null> {
    const name = title.trim()
    if (!name) return null
    try {
      const project = await api.createProject({ title: name, area_id: areaId })
      await reloadSidebar()
      go({ section: 'todos', view: { kind: 'project', id: Number(project.id) }, item: null })
      return project
    }
    catch (cause) { fail(cause, 'Could not create the project.'); return null }
  }

  async function renameArea(id: number, title: string): Promise<void> {
    const name = title.trim()
    if (!name) return
    sidebar.update(side => side && ({ ...side, areas: side.areas.map(area => area.id === id ? { ...area, title: name } : area) }))
    try { await api.updateArea(id, { title: name }) }
    catch (cause) { fail(cause, 'Could not rename the area.'); await reloadSidebar() }
  }

  async function renameProject(id: number, title: string): Promise<void> {
    const name = title.trim()
    if (!name) return
    sidebar.update(side => side && ({ ...side, projects: side.projects.map(project => project.id === id ? { ...project, title: name } : project) }))
    try { await api.updateProject(id, { title: name }) }
    catch (cause) { fail(cause, 'Could not rename the project.'); await reloadSidebar() }
  }

  async function removeArea(id: number): Promise<void> {
    try {
      await api.deleteArea(id)
      if (route().section === 'todos' && (route() as { view: View }).view.kind === 'area' && ((route() as { view: { id: number } }).view.id === id)) go({ section: 'todos', view: { kind: 'list', name: 'inbox' }, item: null })
      await Promise.all([reloadSidebar(), useStore('tasks').load()])
    }
    catch (cause) { fail(cause, 'Could not delete the area.') }
  }

  async function removeProject(id: number): Promise<void> {
    try {
      await api.deleteProject(id)
      const r = route()
      if (r.section === 'todos' && r.view.kind === 'project' && r.view.id === id) go({ section: 'todos', view: { kind: 'list', name: 'inbox' }, item: null })
      await Promise.all([reloadSidebar(), useStore('tasks').load()])
    }
    catch (cause) { fail(cause, 'Could not delete the project.') }
  }

  // Note folders and libraries

  async function createFolder(title: string): Promise<NoteFolder | null> {
    const name = title.trim()
    if (!name) return null
    try {
      const folder = await api.createNoteFolder(name)
      await reloadSidebar()
      go({ section: 'notes', folder: Number(folder.id), item: null })
      return folder
    }
    catch (cause) { fail(cause, 'Could not create the folder.'); return null }
  }

  async function removeFolder(id: number): Promise<void> {
    try {
      await api.deleteNoteFolder(id)
      const r = route()
      if (r.section === 'notes' && r.folder === id) go({ section: 'notes', folder: 'all', item: null })
      await Promise.all([reloadSidebar(), useStore('notes').load()])
    }
    catch (cause) { fail(cause, 'Could not delete the folder.') }
  }

  async function createLibrary(title: string): Promise<number | null> {
    const name = title.trim()
    if (!name) return null
    try {
      const created = await api.createLibrary({ title: name, icon: 'i-hugeicons-book-02', color: '#1f6bff' })
      await reloadSidebar()
      go({ section: 'prompts', library: Number(created.id), item: null })
      return Number(created.id)
    }
    catch (cause) { fail(cause, 'Could not create the library.'); return null }
  }

  /** Ask before something that cannot be undone. */
  function confirm(title: string, message: string, label: string, run: () => void): void {
    confirmation.set({ title, message, label, run })
  }
  function answer(yes: boolean): void {
    const pending = confirmation()
    confirmation.set(null)
    if (yes && pending) pending.run()
  }

  return {
    route, sidebar, libraries, loaded, toasts, confirmation, section, panel, areas, projects, folders, view,
    say, fail, go, open, openItem, back, init, reloadSidebar, createArea, createProject, renameArea, renameProject,
    removeArea, removeProject, createFolder, removeFolder, createLibrary, confirm, answer,
  }
})
