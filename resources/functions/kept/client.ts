import { createApi } from './api'
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
