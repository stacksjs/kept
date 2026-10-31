import { describe, expect, it } from 'bun:test'
import { pagedUrl } from '../../resources/functions/library/client'
import { webSession } from '../../resources/functions/library/session'

describe('client', () => {
  it('asks the paginated index routes for everything', () => {
    expect(pagedUrl('/api/notes')).toBe('/api/notes?per_page=1000')
    expect(pagedUrl('/api/areas')).toBe('/api/areas?per_page=1000')
    expect(pagedUrl('/api/notes?per_page=5')).toBe('/api/notes?per_page=5')
    expect(pagedUrl('/api/notes/4')).toBe('/api/notes/4')
    expect(pagedUrl('/api/lists/today?today=2026-10-30')).toBe('/api/lists/today?today=2026-10-30')
  })

  it('keeps the token in memory when storage throws', () => {
    const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } }
    const session = webSession(broken)
    expect(session.token()).toBeNull()
    session.save('abc')
    expect(session.token()).toBe('abc')
    session.save(null)
    expect(session.token()).toBeNull()
  })

  it('persists the token through storage', () => {
    const data = new Map<string, string>()
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) }
    webSession(storage).save('tok')
    expect(webSession(storage).token()).toBe('tok')
    webSession(storage).save(null)
    expect(webSession(storage).token()).toBeNull()
  })
})
