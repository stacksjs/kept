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
