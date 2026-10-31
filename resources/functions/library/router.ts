import { isSmartList, type SmartList } from '../../../app/Support/lists'

/**
 * Where the signed-in app is, written in the URL hash so Back, reload and a
 * shared link all land in the same place without the server knowing about it.
 *
 *   #/today          a to-do list          #/today/12          with to-do 12 open
 *   #/project/3      a project             #/area/2/12         an area, to-do 12 open
 *   #/notes          all notes             #/notes/f2/7        folder 2, note 7 open
 *   #/prompts/4/9    library 4, prompt 9
 *   #/               the sidebar (what a phone shows first)
 */
export type Route
  = | { section: 'todos', view: { kind: 'list', name: SmartList } | { kind: 'project', id: number } | { kind: 'area', id: number }, item: number | null }
    | { section: 'notes', folder: NoteFolderKey, item: number | null }
    | { section: 'prompts', library: number | null, item: number | null }
    | { section: 'home' }

const positive = (value: string | undefined): number | null => {
  const n = Number(value)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

/** All notes, one folder, one `#tag`, or the recently deleted. */
export type NoteFolderKey = 'all' | 'trash' | number | `tag:${string}`

export const HOME: Route = { section: 'home' }

export function parseRoute(hash: string): Route {
  const [first, a, b, c] = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  if (!first) return HOME
  if (isSmartList(first)) return { section: 'todos', view: { kind: 'list', name: first }, item: positive(a) }
  if ((first === 'project' || first === 'area') && positive(a)) return { section: 'todos', view: { kind: first, id: positive(a)! }, item: positive(b) }
  if (first === 'notes') {
    if (a === 'trash') return { section: 'notes', folder: 'trash', item: positive(b) }
    if (a === 'tag' && b) return { section: 'notes', folder: `tag:${decodeURIComponent(b)}`, item: positive(c) }
    const folder = a?.startsWith('f') ? positive(a.slice(1)) : null
    return { section: 'notes', folder: folder ?? 'all', item: positive(folder ? b : a) ?? positive(folder ? c : b) }
  }
  if (first === 'prompts') return { section: 'prompts', library: positive(a), item: positive(b) }
  return HOME
}

export function formatRoute(route: Route): string {
  switch (route.section) {
    case 'home': return '#/'
    case 'todos': {
      const tail = route.item ? `/${route.item}` : ''
      return route.view.kind === 'list' ? `#/${route.view.name}${tail}` : `#/${route.view.kind}/${route.view.id}${tail}`
    }
    case 'notes': {
      const where = route.folder === 'all' ? '' : route.folder === 'trash' ? '/trash' : typeof route.folder === 'string' ? `/tag/${encodeURIComponent(route.folder.slice(4))}` : `/f${route.folder}`
      return `#/notes${where}${route.item ? `/${route.item}` : ''}`
    }
    case 'prompts': return `#/prompts${route.library ? `/${route.library}` : ''}${route.item ? `/${route.item}` : ''}`
  }
}

/** Which pane a one-column phone shows: the sidebar, a list, or an open item. */
export function panelFor(route: Route): 'sidebar' | 'list' | 'detail' {
  if (route.section === 'home') return 'sidebar'
  return route.item ? 'detail' : 'list'
}

/** The route one step back, which is what a phone's Back button goes to. */
export function parentOf(route: Route): Route {
  if (route.section === 'home') return route
  if (route.item) return { ...route, item: null } as Route
  return HOME
}

/** The same route with a different open item. */
export function withItem(route: Route, item: number | null): Route {
  return route.section === 'home' ? route : ({ ...route, item } as Route)
}
