import { describe, expect, it } from 'bun:test'
import { filterNotes, findLinked, groupNotes, matchSnippet, noteTags, normalizeNote, tagCounts } from '../../resources/functions/kept/notes'
import { filledSegments, filterPrompts, normalizePrompt, publicLinkUrl, segments } from '../../resources/functions/kept/promptview'
import type { Note, Prompt } from '../../resources/functions/kept/types'

const note = (id: number, patch: Partial<Note> = {}): Note => ({ id, title: `Note ${id}`, snippet: '', body: `Note ${id}\nbody`, pinned: false, note_folder_id: null, updated_at: `2026-10-${String(10 + id).padStart(2, '0')}T10:00:00Z`, ...patch })

describe('notes', () => {
  it('finds #tags but not headings, and counts them', () => {
    expect(noteTags('# Heading\nplan #Trip and (#food) #a_b-c\nnot#tag')).toEqual(['trip', 'food', 'a_b-c'])
    expect(noteTags('plain')).toEqual([])
    const list = [note(1, { body: 'x #a #b' }), note(2, { body: 'y #a' })]
    expect(tagCounts(list)).toEqual([{ name: 'a', count: 2 }, { name: 'b', count: 1 }])
    expect(filterNotes(list, 'tag:b', '').map(n => n.id)).toEqual([1])
  })

  it('resolves a note link by title', () => {
    const list = [note(1, { title: 'Trip plan' }), note(2, { title: 'Groceries' })]
    expect(findLinked(list, 'groceries')?.id).toBe(2)
    expect(findLinked(list, 'Trip')?.id).toBe(1)
    expect(findLinked(list, 'Nothing')).toBeNull()
    expect(findLinked(list, '  ')).toBeNull()
  })
  it('turns the server row into a note', () => {
    expect(normalizeNote({ id: 1, pinned: 1, body: null, title: null }).pinned).toBe(true)
    expect(normalizeNote({ id: 1, pinned: 0 }).body).toBe('')
  })

  it('puts pinned notes first and newest edits on top', () => {
    const sections = groupNotes([note(1), note(2), note(3, { pinned: true })])
    expect(sections.map(section => section.label)).toEqual(['Pinned', 'Notes'])
    expect(sections[1]!.notes.map(n => n.id)).toEqual([2, 1])
    expect(groupNotes([note(1)])[0]!.label).toBe('')
    expect(groupNotes([])).toEqual([])
  })

  it('filters by folder and by every word', () => {
    const list = [note(1, { body: 'Shakshuka\neggs and tomatoes', note_folder_id: 4 }), note(2, { body: 'Groceries\neggs' })]
    expect(filterNotes(list, 4, '').map(n => n.id)).toEqual([1])
    expect(filterNotes(list, 'all', 'eggs').map(n => n.id)).toEqual([1, 2])
    expect(filterNotes(list, 'all', 'eggs tomatoes').map(n => n.id)).toEqual([1])
    expect(filterNotes(list, 'all', 'zzz')).toEqual([])
  })

  it('shows context around a match', () => {
    const n = note(1, { snippet: 'first', body: `Title\n${'long text '.repeat(10)}needle here` })
    expect(matchSnippet(n, 'needle')).toContain('needle here')
    expect(matchSnippet(n, 'missing')).toBe('first')
    expect(matchSnippet(n, '')).toBe('first')
  })
})

const prompt = (patch: Partial<Prompt> = {}): Prompt => ({ id: 1, prompt_library_id: 1, title: 'Polite email', description: '', body: 'Write a {{tone}} email to {{name}}', model: '', tags: ['email'], favorite: false, uses: 0, version: 1, variables: ['tone', 'name'], updated_at: '', ...patch })

describe('prompts', () => {
  it('splits the body into text and variable chips', () => {
    expect(segments('Hi {{name}}, ok {{ tone }}!')).toEqual([
      { text: 'Hi ', variable: false },
      { text: '{{name}}', variable: true },
      { text: ', ok ', variable: false },
      { text: '{{ tone }}', variable: true },
      { text: '!', variable: false },
    ])
    expect(segments('')).toEqual([])
  })

  it('shows filled values in place of their chips', () => {
    expect(filledSegments('Hi {{name}} {{x}}', { name: 'Ada' })).toEqual([
      { text: 'Hi ', variable: false },
      { text: 'Ada', variable: true },
      { text: ' ', variable: false },
      { text: '{{x}}', variable: true },
    ])
  })

  it('searches and filters favourites', () => {
    const list = [prompt(), prompt({ id: 2, title: 'Summary', body: 'Summarise', tags: [], favorite: true })]
    expect(filterPrompts(list, 'email', false).map(p => p.id)).toEqual([1])
    expect(filterPrompts(list, '', true).map(p => p.id)).toEqual([2])
    expect(filterPrompts(list, 'summar', true).map(p => p.id)).toEqual([2])
  })

  it('normalises a server prompt and builds the public link', () => {
    const row = normalizePrompt({ id: 1, tags: ['a'], favorite: 1, description: null })
    expect(row.favorite).toBe(true)
    expect(row.description).toBe('')
    expect(publicLinkUrl('https://kept.test/', 'abc')).toBe('https://kept.test/p/abc')
  })
})
