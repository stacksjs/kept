import { describe, expect, it } from 'bun:test'
import { addDays, dayOrToday, isDay, nextOccurrence } from '../../app/Support/dates'

describe('dates', () => {
  it('accepts only real calendar days', () => {
    expect(isDay('2026-02-28')).toBe(true)
    expect(isDay('2026-02-30')).toBe(false)
    expect(isDay('2026-2-3')).toBe(false)
    expect(isDay(20260228)).toBe(false)
  })

  it('falls back to the server date for a bad device date', () => {
    expect(dayOrToday('2026-03-04')).toBe('2026-03-04')
    expect(dayOrToday('tomorrow')).toBe(new Date().toISOString().slice(0, 10))
  })

  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('finds the next repeat, clamping month ends', () => {
    expect(nextOccurrence('2026-01-31', 'monthly')).toBe('2026-02-28')
    expect(nextOccurrence('2028-02-29', 'yearly')).toBe('2029-02-28')
    expect(nextOccurrence('2026-05-01', 'weekly')).toBe('2026-05-08')
    expect(nextOccurrence('2026-05-01', 'daily')).toBe('2026-05-02')
    expect(nextOccurrence('2026-05-01', 'none')).toBeNull()
  })
})
