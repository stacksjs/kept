import { describe, expect, it } from 'bun:test'
import { groupByDay, dayLabel, daysBetween, deadlineLabel, deadlineState, groupUpcoming, initials, noteDate, plural, shortDate } from '../../resources/functions/kept/format'

const today = '2026-10-30'

describe('format', () => {
  it('counts whole days across month ends', () => {
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3)
    expect(daysBetween('2026-11-02', '2026-10-30')).toBe(-3)
  })

  it('writes short dates, with the year only when it is not this one', () => {
    expect(shortDate('2026-11-04', today)).toBe('Nov 4')
    expect(shortDate('2027-01-09', today)).toBe('Jan 9, 2027')
  })

  it('labels days the way people say them', () => {
    expect(dayLabel('2026-10-30', today)).toBe('Today')
    expect(dayLabel('2026-10-31', today)).toBe('Tomorrow')
    expect(dayLabel('2026-10-29', today)).toBe('Yesterday')
    expect(dayLabel('2026-11-03', today)).toBe('Tuesday')
    expect(dayLabel('2026-11-20', today)).toBe('Fri, Nov 20')
  })

  it('classifies and words deadlines', () => {
    expect(deadlineState('2026-10-29', today)).toBe('overdue')
    expect(deadlineState('2026-10-30', today)).toBe('today')
    expect(deadlineState('2026-11-02', today)).toBe('soon')
    expect(deadlineState('2026-12-01', today)).toBe('later')
    expect(deadlineLabel('2026-10-28', today)).toBe('2 days overdue')
    expect(deadlineLabel('2026-10-29', today)).toBe('1 day overdue')
    expect(deadlineLabel('2026-10-30', today)).toBe('Due today')
    expect(deadlineLabel('2026-10-31', today)).toBe('Due tomorrow')
    expect(deadlineLabel('2026-11-03', today)).toBe('Due in 4 days')
    expect(deadlineLabel('2026-12-24', today)).toBe('Due Dec 24')
  })

  it('groups upcoming by day for a week (empty days included), then by month', () => {
    const items = [
      { id: 1, start_date: '2026-10-31' },
      { id: 2, start_date: '2026-10-31' },
      { id: 3, start_date: '2026-11-03' },
      { id: 4, start_date: '2026-11-20' },
      { id: 5, start_date: '2026-11-25' },
      { id: 6, start_date: '2027-01-05' },
    ]
    const groups = groupUpcoming(items, today)
    expect(groups.map(group => group.label)).toEqual(['Tomorrow', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'November', 'January 2027'])
    expect(groups.map(group => group.number)).toEqual(['31', '1', '2', '3', '4', '5', '', ''])
    expect(groups[0]!.items.map(item => item.id)).toEqual([1, 2])
    expect(groups[1]!.items).toEqual([])
    expect(groups[3]!.items.map(item => item.id)).toEqual([3])
    expect(groups[6]!.items.map(item => item.id)).toEqual([4, 5])
  })

  it('groups upcoming by day for a week, then by month', () => {
    const items = [
      { id: 1, start_date: '2026-10-31' },
      { id: 2, start_date: '2026-10-31' },
      { id: 3, start_date: '2026-11-03' },
      { id: 4, start_date: '2026-11-20' },
      { id: 5, start_date: '2026-11-25' },
      { id: 6, start_date: '2027-01-05' },
    ]
    const groups = groupByDay(items, today)
    expect(groups.map(group => group.label)).toEqual(['Tomorrow', 'Tuesday', 'November', 'January 2027'])
    expect(groups[0]!.items.map(item => item.id)).toEqual([1, 2])
    expect(groups[0]!.sub).toBe('Oct 31')
    expect(groups[2]!.items.map(item => item.id)).toEqual([4, 5])
  })

  it('dates notes like Notes.app', () => {
    const now = new Date(2026, 9, 30, 15, 0)
    expect(noteDate(new Date(2026, 9, 29, 9, 0).toISOString(), now)).toBe('Yesterday')
    expect(noteDate(new Date(2026, 9, 27, 9, 0).toISOString(), now)).toBe('Tuesday')
    expect(noteDate(new Date(2026, 8, 1, 9, 0).toISOString(), now)).toBe('Sep 1')
    expect(noteDate(new Date(2026, 9, 30, 9, 5).toISOString(), now)).toMatch(/9:05/)
    expect(noteDate('nonsense', now)).toBe('')
  })

  it('pluralises and makes initials', () => {
    expect(plural(1, 'note')).toBe('1 note')
    expect(plural(3, 'person', 'people')).toBe('3 people')
    expect(initials('Ada Lovelace')).toBe('AL')
    expect(initials('  ')).toBe('?')
  })
})
