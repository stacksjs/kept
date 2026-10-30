import { describe, expect, it } from 'bun:test'
import { inList, listCounts, listsFor, type ListedTodo } from '../../app/Support/lists'

const today = '2026-10-30'
const todo = (over: Partial<ListedTodo>): ListedTodo => ({ id: 1, when: 'inbox', start_date: null, deadline: null, completed_at: null, canceled_at: null, ...over })

describe('smart lists', () => {
  it('keeps an undated, homeless to-do in the Inbox only', () => {
    expect(listsFor(todo({}), today)).toEqual(['inbox'])
  })

  it('moves a to-do filed in a project out of the Inbox into Anytime', () => {
    expect(listsFor(todo({ project_id: 4 }), today)).toEqual(['anytime'])
  })

  it('puts today and this-evening to-dos in Today', () => {
    expect(listsFor(todo({ when: 'today' }), today)).toEqual(['today'])
    expect(listsFor(todo({ when: 'evening' }), today)).toEqual(['today'])
  })

  it('shows a scheduled to-do in Upcoming until its day arrives, then in Today', () => {
    expect(listsFor(todo({ when: 'anytime', start_date: '2026-11-02' }), today)).toEqual(['upcoming'])
    expect(listsFor(todo({ when: 'anytime', start_date: today }), today)).toEqual(['today', 'anytime'])
  })

  it('surfaces what is due or overdue in Today', () => {
    expect(listsFor(todo({ when: 'anytime', deadline: '2026-10-29' }), today)).toContain('today')
    expect(listsFor(todo({ when: 'anytime', deadline: '2026-11-30' }), today)).not.toContain('today')
  })

  it('files finished to-dos in the Logbook, newest first', () => {
    const done = [todo({ id: 1, completed_at: '2026-10-01 10:00:00' }), todo({ id: 2, completed_at: '2026-10-02 10:00:00' }), todo({ id: 3 })]
    expect(inList(done, 'logbook', today).map(t => t.id)).toEqual([2, 1])
    expect(inList(done, 'inbox', today).map(t => t.id)).toEqual([3])
  })

  it('orders Upcoming by start date', () => {
    const later = [todo({ id: 1, start_date: '2026-12-01' }), todo({ id: 2, start_date: '2026-11-05' })]
    expect(inList(later, 'upcoming', today).map(t => t.id)).toEqual([2, 1])
  })

  it('counts lists, evening and overdue', () => {
    const counts = listCounts([todo({ id: 1 }), todo({ id: 2, when: 'evening' }), todo({ id: 3, when: 'anytime', deadline: '2026-10-01' })], today)
    expect(counts).toMatchObject({ inbox: 1, today: 2, evening: 1, overdue: 1 })
  })
})
