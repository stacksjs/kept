import { response } from '@stacksjs/router'
import { resolveAuthenticatedUser } from '@stacksjs/auth'

export interface SignedIn { id: number, email: string, name: string }

/** The signed-in user, or a 401 response to return as is. */
export async function signedIn(request: unknown): Promise<{ user: SignedIn } | { error: Response }> {
  const user = await resolveAuthenticatedUser(request as never).catch(() => null)
  if (!user?.id) return { error: response.json({ error: 'Sign in to continue' }, 401) }
  // The auth layer vouches for who this is; name and email come from the row.
  const row = await User.find(Number(user.id))
  if (!row) return { error: response.json({ error: 'Sign in to continue' }, 401) }
  return { user: { id: Number(row.id), email: String(row.email ?? ''), name: String(row.name ?? '') } }
}

/** A positive integer route parameter, or undefined. */
export function idParam(request: { getParam: (name: string) => unknown }, name = 'id'): number | undefined {
  const value = Number(request.getParam(name))
  return Number.isSafeInteger(value) && value > 0 ? value : undefined
}

export function parseTags(raw: unknown): string[] {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === 'string') : []
  }
  catch { return [] }
}
