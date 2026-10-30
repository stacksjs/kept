import type { Note } from './types'

/**
 * Recently deleted notes. The server removes a deleted note for good, so the
 * browser keeps its own copy for 30 days: Restore writes it back as a new note.
 * The copy lives in this browser only (see the report: a server-side trash
 * would make it follow the account).
 */
export interface Trashed { note: Note, deleted_at: string }

export const TRASH_DAYS = 30
const KEY = 'library.trash'

export function prune(list: Trashed[], now: Date = new Date()): Trashed[] {
  const cutoff = now.getTime() - TRASH_DAYS * 864e5
  return list.filter(entry => Date.parse(entry.deleted_at) >= cutoff)
}

export function addToTrash(list: Trashed[], note: Note, now: Date = new Date()): Trashed[] {
  return prune([{ note, deleted_at: now.toISOString() }, ...list.filter(entry => entry.note.id !== note.id)], now)
}

export function removeFromTrash(list: Trashed[], id: number): Trashed[] {
  return list.filter(entry => entry.note.id !== id)
}

/** Days left before a trashed note is gone. */
export function daysLeft(entry: Trashed, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((Date.parse(entry.deleted_at) + TRASH_DAYS * 864e5 - now.getTime()) / 864e5))
}

type Store = Pick<Storage, 'getItem' | 'setItem'>

export function loadTrash(storage: Store | null = safeStorage(), now: Date = new Date()): Trashed[] {
  try {
    const parsed = JSON.parse(storage?.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? prune(parsed.filter(entry => entry?.note?.id && entry.deleted_at), now) : []
  }
  catch { return [] }
}

export function saveTrash(list: Trashed[], storage: Store | null = safeStorage()): void {
  try { storage?.setItem(KEY, JSON.stringify(list)) }
  catch { /* storage is full or blocked: the trash is a convenience */ }
}

function safeStorage(): Storage | null {
  try { return globalThis.localStorage ?? null } catch { return null }
}
