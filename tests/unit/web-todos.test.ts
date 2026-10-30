import { describe, expect, it } from 'bun:test'
import { allTags, groupLogbook, counts, moveId, newTodoFor, normalizeTodo, orderChanges, parseTagInput, progress, serializeChanges, splitToday, viewItems, whenLabel, whenPatch } from '../../resources/functions/kept/todos'
import type { Todo } from '../../resources/functions/kept/types'

const today = '2026-10-30'
let next = 1
function todo(patch: Partial<Todo> = {}): Todo {
  return { id: next++, title: 'x', notes: '', when: 'inbox', start_date: null, deadline: null, tags: [], repeat: 'none', sort_order: 0, completed_at: null, canceled_at: null, area_id: null, project_id: null, heading_id: null, checklist: [], ...patch }
}

describe('todos', () => {
  it('normalises a generated-route row', () => {
    const row = normalizeTodo({ id: 1, title: 'a', notes: null, tags: '["phone","home"]' })
    expect(row.tags).toEqual(['phone', 'home'])
    expect(row.notes).toBe('')
    expect(row.checklist).toEqual([])
    expect(normalizeTodo({ id: 2, tags: 'not json' }).tags).toEqual([])
  })

  it('sends tags as a JSON string and never the checklist', () => {
    expect(serializeChanges({ tags: ['a'], title: 'x', checklist: [] })).toEqual({ tags: '["a"]', title: 'x' })
  })

  it('shows a view in the order the user arranged it', () => {
    const a = todo({ when: 'today', sort_order: 2 })
    const b = todo({ when: 'today', sort_order: 1 })
    const c = todo({ when: 'inbox' })
    expect(viewItems([a, b, c], { kind: 'list', name: 'today' }, today).map(t => t.id)).toEqual([b.id, a.id])
    expect(viewItems([a, b, c], { kind: 'list', name: 'inbox' }, today).map(t => t.id)).toEqual([c.id])
  })

  it('lists a project or an area, and keeps project items out of the area header', () => {
    const inProject = todo({ project_id: 9, area_id: 4, when: 'anytime' })
    const inArea = todo({ area_id: 4, when: 'anytime' })
    expect(viewItems([inProject, inArea], { kind: 'project', id: 9 }, today).map(t => t.id)).toEqual([inProject.id])
    expect(viewItems([inProject, inArea], { kind: 'area', id: 4 }, today).map(t => t.id)).toEqual([inArea.id])
  })

  it('orders upcoming by date and the logbook newest first', () => {
    const later = todo({ start_date: '2026-11-09' })
    const sooner = todo({ start_date: '2026-11-01' })
    expect(viewItems([later, sooner], { kind: 'list', name: 'upcoming' }, today).map(t => t.id)).toEqual([sooner.id, later.id])
    const old = todo({ completed_at: '2026-10-01T10:00:00Z' })
    const fresh = todo({ completed_at: '2026-10-29T10:00:00Z' })
    expect(viewItems([old, fresh], { kind: 'list', name: 'logbook' }, today).map(t => t.id)).toEqual([fresh.id, old.id])
  })

  it('splits Today from This Evening', () => {
    const day = todo({ when: 'today' })
    const night = todo({ when: 'evening' })
    const split = splitToday([day, night])
    expect(split.main).toEqual([day])
    expect(split.evening).toEqual([night])
  })

  it('counts lists with the shared rules', () => {
    const list = [todo({ when: 'inbox' }), todo({ when: 'today' }), todo({ when: 'evening' }), todo({ deadline: '2026-10-01', when: 'anytime' })]
    const result = counts(list, today)
    expect(result.inbox).toBe(1)
    expect(result.today).toBe(3)
    expect(result.evening).toBe(1)
    expect(result.overdue).toBe(1)
  })

  it('works out progress', () => {
    expect(progress(0, 0)).toBe(0)
    expect(progress(3, 1)).toBe(0.25)
    expect(progress(0, 4)).toBe(1)
  })

  it('files a new to-do where the user is looking', () => {
    expect(newTodoFor({ kind: 'list', name: 'inbox' }, today)).toEqual({ when: 'inbox' })
    expect(newTodoFor({ kind: 'list', name: 'today' }, today)).toEqual({ when: 'today' })
    expect(newTodoFor({ kind: 'list', name: 'upcoming' }, today)).toEqual({ when: 'anytime', start_date: '2026-10-31' })
    expect(newTodoFor({ kind: 'project', id: 3 }, today)).toEqual({ project_id: 3, when: 'anytime' })
    expect(newTodoFor({ kind: 'area', id: 2 }, today)).toEqual({ area_id: 2, when: 'anytime' })
    expect(newTodoFor({ kind: 'list', name: 'logbook' }, today)).toBeNull()
  })

  it('turns a When choice into a patch and back into a label', () => {
    expect(whenPatch('evening')).toEqual({ when: 'evening', start_date: null })
    expect(whenPatch({ date: '2026-12-01' })).toEqual({ when: 'anytime', start_date: '2026-12-01' })
    expect(whenLabel({ when: 'today', start_date: null }, today)).toBe('Today')
    expect(whenLabel({ when: 'anytime', start_date: '2026-12-01' }, today)).toBe('Scheduled')
    expect(whenLabel({ when: 'anytime', start_date: null }, today)).toBe('Anytime')
    expect(whenLabel({ when: 'inbox', start_date: null }, today)).toBe('Inbox')
  })

  it('moves an id and writes only the orders that changed', () => {
    expect(moveId([1, 2, 3, 4], 4, 0)).toEqual([4, 1, 2, 3])
    expect(moveId([1, 2, 3, 4], 1, 2)).toEqual([2, 3, 1, 4])
    expect(moveId([1, 2], 9, 0)).toEqual([1, 2])
    const items = [{ id: 1, sort_order: 1 }, { id: 2, sort_order: 2 }, { id: 3, sort_order: 3 }]
    expect(orderChanges(items, [1, 3, 2])).toEqual([{ id: 3, sort_order: 2 }, { id: 2, sort_order: 3 }])
    expect(orderChanges(items, [1, 2, 3])).toEqual([])
  })

  it('parses typed tags without duplicates', () => {
    expect(parseTagInput('home, #phone,  , Home', ['work'])).toEqual(['work', 'home', 'phone'])
    expect(allTags([todo({ tags: ['b', 'a'] }), todo({ tags: ['a'] })])).toEqual(['a', 'b'])
  })

  it('groups the logbook by the day things were finished, newest first', () => {
    const a = todo({ completed_at: '2026-10-30T09:00:00Z' })
    const b = todo({ completed_at: '2026-10-30T18:00:00Z' })
    const c = todo({ completed_at: '2026-10-28T18:00:00Z' })
    const groups = groupLogbook([a, b, c], today, iso => iso.slice(0, 10), day => `on ${day}`)
    expect(groups.map(g => g.key)).toEqual(['2026-10-30', '2026-10-28'])
    expect(groups[0]!.items.map(t => t.id)).toEqual([a.id, b.id])
    expect(groups[0]!.label).toBe('on 2026-10-30')
  })
})
