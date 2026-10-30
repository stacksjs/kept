import { describe, expect, it } from 'bun:test'
import { noteTitleAndSnippet } from '../../app/Support/notes'
import { fillPrompt, promptVariables } from '../../app/Support/prompts'
import { hashShareToken, newShareToken } from '../../app/Support/sharing'

describe('prompts', () => {
  it('finds each variable once, in order', () => {
    expect(promptVariables('Write a {{tone}} note to {{ name }} about {{topic}}. Thanks, {{name}}.')).toEqual(['tone', 'name', 'topic'])
  })

  it('fills known variables and leaves unknown or empty ones visible', () => {
    expect(fillPrompt('Hi {{name}}, re {{topic}} {{missing}}', { name: 'Sam', topic: '' })).toBe('Hi Sam, re {{topic}} {{missing}}')
  })
})

describe('notes', () => {
  it('titles a note by its first line and previews the next', () => {
    expect(noteTitleAndSnippet('# Trip plan\n\n- [ ] Book flights\nmore')).toEqual({ title: 'Trip plan', snippet: 'Book flights' })
    expect(noteTitleAndSnippet('')).toEqual({ title: '', snippet: '' })
  })
})

describe('share tokens', () => {
  it('are unguessable and hashed deterministically', () => {
    const a = newShareToken()
    expect(a.length).toBeGreaterThanOrEqual(32)
    expect(newShareToken()).not.toBe(a)
    expect(hashShareToken(a)).toBe(hashShareToken(a))
    expect(hashShareToken(a)).toMatch(/^[0-9a-f]{64}$/)
  })
})
