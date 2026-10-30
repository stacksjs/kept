import { createApi, today } from './api'
import { webSession } from './session'

/** Lists the generated routes paginate at 15 rows; ask for everything in one page. */
const PAGED = /^\/api\/(notes|areas|note-folders)$/

export function pagedUrl(input: string): string {
  const [path = '', query = ''] = input.split('?')
  if (!PAGED.test(path) || /(^|&)per_page=/.test(query)) return input
  return `${path}?${query ? `${query}&` : ''}per_page=1000`
}

/** The one session and API client of the web app, shared by every store. */
export const session = webSession()

export const api = createApi({
  session,
  fetch: (input, init) => fetch(typeof input === 'string' ? pagedUrl(input) : input, init),
  onSignedOut: () => {
    const here = `${globalThis.location?.pathname ?? ''}${globalThis.location?.hash ?? ''}`
    globalThis.location?.assign(`/login?next=${encodeURIComponent(here)}`)
  },
})

/** Where the page is served from, for building a public link. */
export const origin = (): string => globalThis.location?.origin ?? ''

/** Navigate the whole page (sign-in and sign-out leave the single-page app). */
export function go(url: string): void {
  globalThis.location?.assign(url)
}

/** Copy text to the clipboard; false when the browser refuses. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await globalThis.navigator.clipboard.writeText(text)
    return true
  }
  catch {
    return false
  }
}

/** The `?next=` a sign-in page should return to: only paths inside this app, never another site. */
export function safeNext(value: string | null | undefined, fallback = '/app'): string {
  return value && /^\/(?!\/)/.test(value) && !value.includes('\\') ? value : fallback
}

/** The device's calendar day (`YYYY-MM-DD`), which is what Today means. */
export const deviceDay = (): string => today()

/** One query-string parameter of the current page, or null. */
export function queryParam(name: string): string | null {
  return new URLSearchParams(globalThis.location?.search ?? '').get(name)
}

/** Focus the element marked `data-focus="name"`, once the markup for it exists. */
export function focusField(name: string): void {
  const find = (): HTMLElement | null => globalThis.document?.querySelector<HTMLElement>(`[data-focus="${name}"]`) ?? null
  const el = find()
  if (el) { el.focus(); return }
  setTimeout(() => find()?.focus(), 60)
}

/** Keep the keyboard cursor row in view. */
export function scrollCursorIntoView(): void {
  globalThis.document?.querySelector('[data-state~="cursor"]')?.scrollIntoView({ block: 'nearest' })
}

/** True on a window wide enough for the sidebar and list side by side. */
export const isWide = (): boolean => !!globalThis.matchMedia?.('(min-width: 720px)').matches

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** The element that has focus now, so a sheet can give focus back to it when it closes. */
export const activeElement = (): HTMLElement | null => (globalThis.document?.activeElement as HTMLElement | null) ?? null

/** Move focus into a sheet: the element asking for it (`data-autofocus`), else the first control. */
export function focusFirst(panel: HTMLElement | null): void {
  if (!panel) return
  const target = panel.querySelector<HTMLElement>('[data-autofocus]') ?? panel.querySelector<HTMLElement>(FOCUSABLE)
  target?.focus()
}

/** Keep Tab inside a sheet: from the last control it wraps to the first, and back. */
export function trapTab(panel: HTMLElement | null, event: KeyboardEvent): void {
  if (!panel || event.key !== 'Tab') return
  const nodes = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(node => node.offsetParent !== null)
  if (!nodes.length) return
  const first = nodes[0]!
  const last = nodes[nodes.length - 1]!
  const active = activeElement()
  if (event.shiftKey && active === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus() }
}

/** The last path segment of the current URL, which is the token on `/p/<token>`. */
export function lastPathSegment(): string {
  const parts = (globalThis.location?.pathname ?? '').split('/').filter(Boolean)
  return decodeURIComponent(parts[parts.length - 1] ?? '')
}
