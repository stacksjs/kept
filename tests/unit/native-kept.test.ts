import { describe, expect, it } from 'bun:test'
import { nativeUrl, palette } from '../../resources/functions/kept/native-kept'

describe('native API urls', () => {
  it('asks the paged list routes for every row', () => {
    const base = 'http://127.0.0.1:3408'
    expect(nativeUrl(base, `${base}/api/notes`)).toBe(`${base}/api/notes?per_page=1000`)
    expect(nativeUrl(base, `${base}/api/note-folders?sort=title`)).toBe(`${base}/api/note-folders?sort=title&per_page=1000`)
    expect(nativeUrl(base, `${base}/api/notes?per_page=5`)).toBe(`${base}/api/notes?per_page=5`)
    expect(nativeUrl(base, `${base}/api/notes/4`)).toBe(`${base}/api/notes/4`)
    expect(nativeUrl(base, `${base}/api/lists/today?today=2026-10-30`)).toBe(`${base}/api/lists/today?today=2026-10-30`)
    expect(nativeUrl('', '/api/areas')).toBe('/api/areas?per_page=1000')
  })

  it('paints both themes', () => {
    expect(palette('dark').dark).toBe(true)
    expect(palette('light').list).toBe('#ffffff')
    expect(palette('dark').list).not.toBe(palette('light').list)
  })
})
