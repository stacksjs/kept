import type { NoteFolderKey } from './router'
import type { Note } from './types'

/** The server sends `pinned` as 0 or 1; make it a boolean. */
export function normalizeNote(raw: Record<string, unknown>): Note {
  return { ...(raw as unknown as Note), pinned: Boolean(raw.pinned), body: typeof raw.body === 'string' ? raw.body : '', title: String(raw.title ?? ''), snippet: String(raw.snippet ?? '') }
}

const byRecent = (a: Note, b: Note): number => String(b.updated_at).localeCompare(String(a.updated_at)) || b.id - a.id

export interface NoteSection { key: string, label: string, notes: Note[] }

/** Notes.app puts pinned notes in their own group above the rest, newest edit first in each. */
export function groupNotes(notes: Note[]): NoteSection[] {
  const pinned = notes.filter(note => note.pinned).sort(byRecent)
  const rest = notes.filter(note => !note.pinned).sort(byRecent)
  const sections: NoteSection[] = []
  if (pinned.length) sections.push({ key: 'pinned', label: 'Pinned', notes: pinned })
  if (rest.length) sections.push({ key: 'notes', label: pinned.length ? 'Notes' : '', notes: rest })
  return sections
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
