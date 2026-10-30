import { createHash, randomBytes } from 'node:crypto'
import type { SignedIn } from './session'

export type Role = 'owner' | 'editor' | 'viewer'

export function newShareToken(): string {
  return randomBytes(24).toString('base64url')
}

export function hashShareToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * A person invited by email before they had an account is bound to their user
 * the first time they sign in, so the library simply appears under "Shared with me".
 */
export async function claimPendingShares(user: SignedIn): Promise<void> {
  if (!user.email) return
  const pending = await Share.where('email', user.email.toLowerCase()).whereNull('sharedWithUserId').get()
  for (const share of pending) await share.update({ sharedWithUserId: user.id, acceptedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') })
}

/** What this user may do with a prompt library, or null when it is not theirs and not shared with them. */
export async function libraryRole(libraryId: number, user: SignedIn): Promise<{ role: Role, library: Record<string, any> } | null> {
  const library = await PromptLibrary.find(libraryId)
  if (!library) return null
  if (Number(library.user_id) === user.id) return { role: 'owner', library: library.toJSON() }
  const share = await Share.where('resourceType', 'library').where('resourceId', libraryId).where('sharedWithUserId', user.id).first()
  if (!share) return null
  return { role: share.role === 'editor' ? 'editor' : 'viewer', library: library.toJSON() }
}
