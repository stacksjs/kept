import type { Session } from './api'

const KEY = 'kept.token'

/**
 * The web app's session: the bearer token lives in localStorage so a reload
 * keeps you signed in. Storage can throw (private windows, blocked site data),
 * so every access is guarded and the token also lives in memory for the tab.
 * The native app swaps this for a Keychain-backed `Session`.
 */
export function webSession(storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null): Session {
  const store = storage === undefined ? safeLocalStorage() : storage
  let memory: string | null = null
  try { memory = store?.getItem(KEY) ?? null } catch { memory = null }
  return {
    token: () => memory,
    save(token) {
      memory = token
      try {
        if (token) store?.setItem(KEY, token)
        else store?.removeItem(KEY)
      }
      catch { /* the tab still holds it in memory */ }
    },
  }
}

function safeLocalStorage(): Storage | null {
  try { return globalThis.localStorage ?? null } catch { return null }
}
