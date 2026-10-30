/**
 * The Mac app's bridge to Craft: the `craft` object, the Keychain-backed
 * session behind `createApi`, and the offline cache over Craft's storage.
 * Screens import from here and from `native-model.ts`; nothing here is used
 * by the web app.
 */
import type { NativeCraft, NativeDesktop } from '@stacksjs/stx/native'
import { createApi, type KeptApi, type Session } from './api'
import { capForCache, cacheKey, type CacheName } from './native-model'

export function nativeCraft(): NativeCraft {
  return (globalThis as unknown as { craft: NativeCraft }).craft
}

export function desktop(): NativeDesktop {
  const value = nativeCraft().desktop
  if (!value) throw new Error('Kept for Mac needs the Craft AppKit host.')
  return value
}

/** Where the Keychain item lives; it is also Craft's session key, so every window hears sign-in and sign-out. */
export const TOKEN_KEY = 'auth.token'

export interface NativeSession extends Session {
  /** Take a token another window wrote (or removed) without writing it back. */
  adopt: (token: string | null) => void
}

/**
 * The bearer token in the macOS Keychain. The write is asynchronous, so the
 * token is also held in memory: the request right after sign-in must not read
 * the Keychain before the write has landed.
 */
export function keychainSession(): NativeSession {
  const secure = nativeCraft().secureStorage
  let memory: string | null = null
  try { memory = secure.getSync(TOKEN_KEY) || null } catch { memory = null }
  return {
    token: () => memory,
    save(token) {
      memory = token
      const write = token ? secure.set(TOKEN_KEY, token) : secure.remove(TOKEN_KEY)
      Promise.resolve(write).catch((error: unknown) => console.error(`Could not update the Keychain: ${(error as Error)?.message ?? error}`))
    },
    adopt(token) { memory = token },
  }
}

/** The generated list routes page at 15 rows by default; ask for all of them, as the web client does. */
const PAGED = /^\/api\/(notes|areas|note-folders|todos|checklist-items)$/

export function nativeUrl(base: string, input: string): string {
  const [path = '', query = ''] = input.split('?')
  const relative = path.startsWith(base) ? path.slice(base.length) : path
  if (!PAGED.test(relative) || /(^|&)per_page=/.test(query)) return input
  return `${path}?${query ? `${query}&` : ''}per_page=1000`
}

/** The API client against the server the app was built for (`craft.app.url`). */
export function nativeApi(session: Session, onSignedOut?: () => void): KeptApi {
  const base = (nativeCraft().app.url || '').replace(/\/+$/, '')
  return createApi({
    base,
    session,
    onSignedOut,
    fetch: ((input: string, init?: RequestInit) => fetch(nativeUrl(base, String(input)), init)) as typeof fetch,
  })
}

export function apiOrigin(): string {
  return (nativeCraft().app.url || '').replace(/\/+$/, '')
}

// The offline cache. Craft's synchronous storage keeps a JSON string per key in
// UserDefaults, which has no null: values always go through JSON, never raw.

export interface Account { id: number, email: string, name: string }

const ACCOUNT_KEY = 'kept.account'

export function savedAccount(): Account | null {
  try {
    const value = nativeCraft().storage.getSync<Account | string>(ACCOUNT_KEY)
    const account = typeof value === 'string' ? JSON.parse(value) as Account : value
    return account && typeof account.id === 'number' ? account : null
  }
  catch { return null }
}

export function saveAccount(account: Account | null): void {
  try { nativeCraft().storage.setSync(ACCOUNT_KEY, account) } catch { /* the cache is a convenience */ }
}

export function readCache<T>(account: Account | null, name: CacheName): T | null {
  if (!account) return null
  try {
    const value = nativeCraft().storage.getSync<T | string>(cacheKey(account.id, name))
    return (typeof value === 'string' ? JSON.parse(value) : value) as T | null
  }
  catch { return null }
}

export function writeCache(account: Account | null, name: CacheName, value: unknown): void {
  if (!account) return
  try { nativeCraft().storage.setSync(cacheKey(account.id, name), capForCache(name, value)) } catch { /* the cache is a convenience */ }
}

/** The surfaces the screens paint themselves; text uses the system's label colours, which follow the theme on their own. */
export function palette(scheme: 'light' | 'dark') {
  const dark = scheme === 'dark'
  return {
    dark,
    list: dark ? '#1e1e20' : '#ffffff',
    detail: dark ? '#262628' : '#f6f6f7',
    selection: dark ? '#2c3e5c' : '#dce8fd',
    hover: dark ? '#2a2a2c' : '#f2f2f4',
    field: dark ? '#2c2c2e' : '#ffffff',
    muted: dark ? '#98989d' : '#6e6e73',
    accent: '#1a7cf5',
    danger: dark ? '#ff6b6b' : '#c62828',
    variable: dark ? '#8cb8ff' : '#1652b8',
    variableFill: dark ? '#1d2a3d' : '#e6efff',
  }
}
