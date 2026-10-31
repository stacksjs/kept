import { defineStore, state } from '@stacksjs/stx'
import { api, go, safeNext, session } from '../functions/library/client'
import { ApiError } from '../functions/library/api'

interface User { id: number, email: string, name: string }

/** Who is signed in, and the sign-in, sign-up and sign-out flows. The token itself lives in `functions/library/session.ts`. */
defineStore('account', () => {
  const user = state<User | null>(null)
  const ready = state(false)
  const busy = state(false)
  const error = state('')

  const message = (cause: unknown, fallback: string): string => {
    if (cause instanceof ApiError) {
      const fields = (cause.body as { errors?: Record<string, string[]> } | null)?.errors
      const first = fields ? Object.values(fields)[0]?.[0] : ''
      return first || cause.message || fallback
    }
    return fallback
  }

  /** The app's guard: true when there is a signed-in user, otherwise sends the visitor to sign in. */
  async function require(): Promise<boolean> {
    if (!session.token()) {
      go(`/login?next=${encodeURIComponent('/app')}`)
      return false
    }
    try { user.set(await api.me()) }
    catch (cause) {
      // A 401 already cleared the token and redirected; anything else (offline) keeps the page.
      if (!(cause instanceof ApiError && cause.status === 401)) error.set('Could not reach Library. Check your connection.')
      ready.set(true)
      return !!user()
    }
    ready.set(true)
    return true
  }

  /** On the sign-in and sign-up pages: someone already signed in goes straight to the app. */
  function redirectIfSignedIn(next: string | null): void {
    if (session.token()) go(safeNext(next))
  }

  async function signIn(email: string, password: string, next: string | null): Promise<void> {
    error.set('')
    if (!email.trim() || !password) { error.set('Enter your email and password.'); return }
    busy.set(true)
    try {
      user.set(await api.signIn(email.trim(), password))
      go(safeNext(next))
    }
    catch (cause) { error.set(message(cause, 'That email and password do not match.')); busy.set(false) }
  }

  async function signUp(name: string, email: string, password: string): Promise<void> {
    error.set('')
    if (!name.trim() || !email.trim()) { error.set('Enter your name and email.'); return }
    if (password.length < 8) { error.set('Use at least 8 characters for the password.'); return }
    busy.set(true)
    try {
      user.set(await api.signUp(name.trim(), email.trim(), password))
      go('/app')
    }
    catch (cause) { error.set(message(cause, 'We could not create that account.')); busy.set(false) }
  }

  async function signOut(): Promise<void> {
    try { await api.signOut() }
    catch { /* the token is dropped either way */ }
    user.set(null)
    go('/login')
  }

  return { user, ready, busy, error, require, redirectIfSignedIn, signIn, signUp, signOut }
})
