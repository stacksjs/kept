import { describe, expect, it } from 'bun:test'
import { commandFor, isTyping } from '../../resources/functions/kept/shortcuts'

describe('shortcuts', () => {
  it('moves with j/k and the arrow keys when not typing', () => {
    expect(commandFor({ key: 'j' })).toBe('next')
    expect(commandFor({ key: 'ArrowDown' })).toBe('next')
    expect(commandFor({ key: 'k' })).toBe('prev')
    expect(commandFor({ key: 'ArrowUp' })).toBe('prev')
  })

  it('leaves letters alone while typing', () => {
    expect(commandFor({ key: 'j', tag: 'input' })).toBeNull()
    expect(commandFor({ key: 'n', tag: 'textarea' })).toBeNull()
    expect(commandFor({ key: 'n', editable: true })).toBeNull()
    expect(isTyping({ tag: 'select' })).toBe(true)
    expect(isTyping({ tag: 'div' })).toBe(false)
  })

  it('opens with Enter or Space, unless a button already owns them', () => {
    expect(commandFor({ key: 'Enter' })).toBe('open')
    expect(commandFor({ key: ' ' })).toBe('open')
    expect(commandFor({ key: 'Enter', actionable: true })).toBeNull()
    expect(commandFor({ key: ' ', tag: 'input' })).toBeNull()
  })

  it('completes with cmd or ctrl Enter, even from a field', () => {
    expect(commandFor({ key: 'Enter', metaKey: true, tag: 'input' })).toBe('complete')
    expect(commandFor({ key: 'Enter', ctrlKey: true })).toBe('complete')
  })

  it('starts a new item with n and searches with slash or cmd+f', () => {
    expect(commandFor({ key: 'n' })).toBe('new')
    expect(commandFor({ key: '/' })).toBe('search')
    expect(commandFor({ key: 'f', metaKey: true })).toBe('search')
    expect(commandFor({ key: 'n', metaKey: true })).toBeNull()
  })

  it('reorders with alt+arrow and always honours Escape and save', () => {
    expect(commandFor({ key: 'ArrowUp', altKey: true })).toBe('moveUp')
    expect(commandFor({ key: 'ArrowDown', altKey: true, tag: 'input' })).toBe('moveDown')
    expect(commandFor({ key: 'Escape', tag: 'input' })).toBe('close')
    expect(commandFor({ key: 's', metaKey: true, tag: 'textarea' })).toBe('save')
  })

  it('does nothing but close while a sheet is open', () => {
    expect(commandFor({ key: 'j', modal: true })).toBeNull()
    expect(commandFor({ key: 'Escape', modal: true })).toBe('close')
  })

  it('opens Quick Entry from anywhere', () => {
    expect(commandFor({ key: ' ', ctrlKey: true })).toBe('quickEntry')
    expect(commandFor({ key: ' ', ctrlKey: true, tag: 'textarea' })).toBe('quickEntry')
    expect(commandFor({ key: 'N', metaKey: true, shiftKey: true })).toBe('quickEntry')
    expect(commandFor({ key: 'n', metaKey: true })).toBeNull()
  })
})
