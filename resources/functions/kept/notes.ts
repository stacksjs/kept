import type { NoteFolderKey } from './router'
import type { Note } from './types'

/** The server sends `pinned` as 0 or 1; make it a boolean. */
export function normalizeNote(raw: Record<string, unknown>): Note {
  return { ...(raw as unknown as Note), pinned: Boolean(raw.pinned), body: typeof raw.body === 'string' ? raw.body : '', title: String(raw.title ?? ''), snippet: String(raw.snippet ?? '') }
}

/** A note row as the server sends it, with the dates the list sorts and counts by. */
export type NoteRow = Note & { created_at?: string, deleted_at?: string }

export type NoteSort = 'edited' | 'created' | 'title'
export const NOTE_SORTS: Array<{ id: NoteSort, label: string }> = [
  { id: 'edited', label: 'Date edited' },
  { id: 'created', label: 'Date created' },
  { id: 'title', label: 'Title' },
]

export function sortNotes(notes: Note[], sort: NoteSort = 'edited'): Note[] {
  const by = (note: Note): string => String(sort === 'created' ? ((note as NoteRow).created_at ?? note.updated_at) : note.updated_at)
  return [...notes].sort((a, b) => sort === 'title'
    ? (a.title || 'zzz').localeCompare(b.title || 'zzz', undefined, { sensitivity: 'base' }) || a.id - b.id
    : by(b).localeCompare(by(a)) || b.id - a.id)
}

export interface NoteSection { key: string, label: string, notes: Note[] }

/** Notes.app puts pinned notes in their own group above the rest, each group in the chosen order. */
export function groupNotes(notes: Note[], sort: NoteSort = 'edited'): NoteSection[] {
  const pinned = sortNotes(notes.filter(note => note.pinned), sort)
  const rest = sortNotes(notes.filter(note => !note.pinned), sort)
  const sections: NoteSection[] = []
  if (pinned.length) sections.push({ key: 'pinned', label: 'Pinned', notes: pinned })
  if (rest.length) sections.push({ key: 'notes', label: pinned.length ? 'Notes' : '', notes: rest })
  return sections
}

/** Days until a deleted note is gone for good (the server keeps them `days` days). */
export function daysLeft(deletedAt: string | undefined, days: number, now: Date = new Date()): number {
  if (!deletedAt) return days
  const gone = Date.parse(deletedAt.includes('T') ? deletedAt : `${deletedAt.replace(' ', 'T')}Z`) + days * 864e5
  return Math.max(0, Math.ceil((gone - now.getTime()) / 864e5))
}

/** The notes in a folder (or all of them) that contain every word of the search. */
export function filterNotes(notes: Note[], folder: NoteFolderKey, search: string): Note[] {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean)
  return notes.filter((note) => {
    if (typeof folder === 'number' && note.note_folder_id !== folder) return false
    if (typeof folder === 'string' && folder.startsWith('tag:') && !noteTags(note.body).includes(folder.slice(4))) return false
    if (!words.length) return true
    const text = `${note.title}\n${note.body}`.toLowerCase()
    return words.every(word => text.includes(word))
  })
}

/** A line of context around the first match, for a search result. */
export function matchSnippet(note: Note, search: string): string {
  const needle = search.trim().toLowerCase()
  if (!needle) return note.snippet
  const text = note.body.replace(/\s+/g, ' ')
  const at = text.toLowerCase().indexOf(needle)
  if (at < 0) return note.snippet
  const from = Math.max(0, at - 24)
  return `${from > 0 ? '...' : ''}${text.slice(from, at + needle.length + 60).trim()}`
}

/**
 * The `#tags` in a note, lower case and without repeats. A `#` followed by a space
 * is a Markdown heading, not a tag, and a tag must follow a space, a bracket or the start of a line.
 */
export function noteTags(body: string): string[] {
  const found = new Set<string>()
  for (const match of body.matchAll(/(^|[\s(])#([\p{L}\p{N}_-]+)/gu)) found.add(match[2]!.toLowerCase())
  return [...found]
}

export function tagCounts(notes: Note[]): Array<{ name: string, count: number }> {
  const counts = new Map<string, number>()
  for (const note of notes) for (const tag of noteTags(note.body)) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name))
}

/** The note a `[[Title]]` link points to: an exact (case-insensitive) title match, else the first note whose title starts with it. */
export function findLinked(notes: Note[], title: string): Note | null {
  const wanted = title.trim().toLowerCase()
  if (!wanted) return null
  return notes.find(note => note.title.toLowerCase() === wanted) ?? notes.find(note => note.title.toLowerCase().startsWith(wanted)) ?? null
}
