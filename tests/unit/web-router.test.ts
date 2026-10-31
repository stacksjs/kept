import { describe, expect, it } from 'bun:test'
import { formatRoute, HOME, panelFor, parentOf, parseRoute, withItem } from '../../resources/functions/library/router'

describe('router', () => {
  it('reads and writes to-do routes', () => {
    expect(parseRoute('#/today')).toEqual({ section: 'todos', view: { kind: 'list', name: 'today' }, item: null })
    expect(parseRoute('#/inbox/12')).toEqual({ section: 'todos', view: { kind: 'list', name: 'inbox' }, item: 12 })
    expect(parseRoute('#/project/3/7')).toEqual({ section: 'todos', view: { kind: 'project', id: 3 }, item: 7 })
    expect(formatRoute(parseRoute('#/area/2'))).toBe('#/area/2')
    expect(formatRoute(parseRoute('#/logbook/5'))).toBe('#/logbook/5')
  })

  it('reads and writes notes and prompt routes', () => {
    expect(parseRoute('#/notes')).toEqual({ section: 'notes', folder: 'all', item: null })
    expect(parseRoute('#/notes/9')).toEqual({ section: 'notes', folder: 'all', item: 9 })
    expect(parseRoute('#/notes/f2/7')).toEqual({ section: 'notes', folder: 2, item: 7 })
    expect(formatRoute({ section: 'notes', folder: 2, item: 7 })).toBe('#/notes/f2/7')
    expect(formatRoute({ section: 'notes', folder: 'all', item: null })).toBe('#/notes')
    expect(parseRoute('#/prompts/4/9')).toEqual({ section: 'prompts', library: 4, item: 9 })
    expect(formatRoute({ section: 'prompts', library: 4, item: null })).toBe('#/prompts/4')
  })

  it('reads and writes tag and trash folders', () => {
    expect(parseRoute('#/notes/trash')).toEqual({ section: 'notes', folder: 'trash', item: null })
    expect(parseRoute('#/notes/trash/8')).toEqual({ section: 'notes', folder: 'trash', item: 8 })
    expect(parseRoute('#/notes/tag/trip/3')).toEqual({ section: 'notes', folder: 'tag:trip', item: 3 })
    expect(formatRoute({ section: 'notes', folder: 'tag:big trip', item: null })).toBe('#/notes/tag/big%20trip')
    expect(formatRoute({ section: 'notes', folder: 'trash', item: 2 })).toBe('#/notes/trash/2')
  })

  it('falls back to home for anything it does not know', () => {
    expect(parseRoute('')).toEqual(HOME)
    expect(parseRoute('#/')).toEqual(HOME)
    expect(parseRoute('#/nonsense/3')).toEqual(HOME)
    expect(parseRoute('#/project/abc')).toEqual(HOME)
    expect(parseRoute('#/inbox/-4').section).toBe('todos')
    expect(parseRoute('#/inbox/-4')).toMatchObject({ item: null })
  })

  it('decides which pane a phone shows and where Back goes', () => {
    expect(panelFor(HOME)).toBe('sidebar')
    expect(panelFor(parseRoute('#/today'))).toBe('list')
    expect(panelFor(parseRoute('#/today/4'))).toBe('detail')
    expect(parentOf(parseRoute('#/today/4'))).toEqual(parseRoute('#/today'))
    expect(parentOf(parseRoute('#/today'))).toEqual(HOME)
    expect(withItem(parseRoute('#/notes/f1'), 3)).toEqual({ section: 'notes', folder: 1, item: 3 })
    expect(withItem(HOME, 3)).toEqual(HOME)
  })
})
