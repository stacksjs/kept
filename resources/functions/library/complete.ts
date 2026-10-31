import { CompleterUnavailable, type Completer, type CompletionRequest } from './ghost'
import { session } from './client'

/**
 * The real completer: POST /api/complete { context, before, after, kind }
 * answers { completion }. Until that route exists it answers 404, which the
 * ghost controller takes as "not available" and stops asking.
 */
export const apiCompleter: Completer = async (request: CompletionRequest, signal: AbortSignal) => {
  const token = session.token()
  const res = await fetch('/api/complete', {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json', 'accept': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(request),
  })
  if (res.status === 404 || res.status === 405 || res.status === 501) throw new CompleterUnavailable()
  if (!res.ok) return ''
  const json = await res.json().catch(() => null) as { completion?: unknown } | null
  return typeof json?.completion === 'string' ? json.completion : ''
}

/**
 * A development stand-in so the overlay can be seen and tested before the
 * server route exists. Turn it on with `localStorage.setItem('library.ghost', 'stub')`.
 */
export const stubCompleter: Completer = async (request) => {
  await new Promise(resolve => setTimeout(resolve, 120))
  const lead = /\s$/.test(request.before) ? '' : ' '
  return lead + (request.kind === 'prompt' ? 'and explain the reasoning step by step.' : request.kind === 'todo' ? 'this week.' : 'and follow up with a short summary.')
}

/** The completer to use: the stub when asked for, otherwise the server's. */
export function pickCompleter(storage: Pick<Storage, 'getItem'> | null = safeStorage()): Completer {
  try { if (storage?.getItem('library.ghost') === 'stub') return stubCompleter }
  catch { /* storage blocked */ }
  return apiCompleter
}

function safeStorage(): Storage | null {
  try { return globalThis.localStorage ?? null } catch { return null }
}
