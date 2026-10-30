import { describe, expect, it } from 'bun:test'
import { addToTrash, daysLeft, loadTrash, prune, removeFromTrash, saveTrash } from '../../resources/functions/kept/trash'
import type { Note } from '../../resources/functions/kept/types'

const note = (id: number): Note => ({ id, title: `n${id}`, snippet: '', body: `n${id}`, pinned: false, note_folder_id: null, updated_at: '2026-10-01T00:00:00Z' })
const now = new Date('2026-10-30T12:00:00Z')

describe('trash', () => {
  it('keeps the newest first and one copy per note', () => {
    let list = addToTrash([], note(1), now)
    list = addToTrash(list, note(2), now)
    list = addToTrash(list, note(1), now)
    expect(list.map(entry => entry.note.id)).toEqual([1, 2])
  })

  it('forgets notes after 30 days', () => {
    const old = { note: note(1), deleted_at: '2026-09-01T00:00:00Z' }
    const fresh = { note: note(2), deleted_at: '2026-10-29T00:00:00Z' }
    expect(prune([old, fresh], now).map(entry => entry.note.id)).toEqual([2])
    expect(daysLeft(fresh, now)).toBe(29)
    expect(daysLeft(old, now)).toBe(0)
  })

  it('removes one note', () => {
    expect(removeFromTrash(addToTrash([], note(1), now), 1)).toEqual([])
  })

  it('round trips through storage and survives garbage', () => {
    const data = new Map<string, string>()
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
    saveTrash(addToTrash([], note(5), now), storage)
    expect(loadTrash(storage, now).map(entry => entry.note.id)).toEqual([5])
    data.set('library.trash', 'not json')
    expect(loadTrash(storage, now)).toEqual([])
    expect(loadTrash(null, now)).toEqual([])
  })
})
