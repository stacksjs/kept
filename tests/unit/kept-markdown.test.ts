import { describe, expect, it } from 'bun:test'
import { applyFormat, checkProgress, continueList, inline, renderMarkdown, toggleCheckLine } from '../../resources/functions/kept/markdown'

describe('markdown', () => {
  it('escapes markup before formatting', () => {
    expect(inline('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(inline('**bold** and *soft* and `code`')).toBe('<strong>bold</strong> and <em>soft</em> and <code>code</code>')
  })

  it('only links http, https and mailto', () => {
    expect(inline('[a](https://x.test/p?q=1&r=2)')).toContain('href="https://x.test/p?q=1&amp;r=2"')
    expect(inline('[a](javascript:alert(1))')).not.toContain('<a')
  })

  it('renders headings, lists and paragraphs', () => {
    const html = renderMarkdown('# Title\nplain\n- one\n- two\n1. first\n\n## Sub')
    expect(html).toContain('<h2>Title</h2>')
    expect(html).toContain('<p>plain</p>')
    expect(html).toContain('<ul><li>one</li><li>two</li></ul>')
    expect(html).toContain('<ol><li>first</li></ol>')
    expect(html).toContain('<h3>Sub</h3>')
  })

  it('renders check lines as buttons that remember their source line', () => {
    const html = renderMarkdown('intro\n- [ ] milk\n- [x] eggs')
    expect(html).toContain('data-line="1"')
    expect(html).toContain('data-line="2"')
    expect(html).toContain('aria-checked="false"')
    expect(html).toContain('aria-checked="true"')
    expect(html).toContain('is-done')
  })

  it('flips exactly one check line', () => {
    const body = 'a\n- [ ] one\n  - [X] two\n- plain'
    expect(toggleCheckLine(body, 1)).toBe('a\n- [x] one\n  - [X] two\n- plain')
    expect(toggleCheckLine(body, 2)).toBe('a\n- [ ] one\n  - [ ] two\n- plain')
    expect(toggleCheckLine(body, 3)).toBe(body)
    expect(toggleCheckLine(body, 99)).toBe(body)
  })

  it('counts progress', () => {
    expect(checkProgress('- [ ] a\n- [x] b\n- [x] c\nnope')).toEqual({ done: 2, total: 3 })
    expect(checkProgress('nothing')).toEqual({ done: 0, total: 0 })
  })

  it('continues a list on Enter and ends it on an empty item', () => {
    expect(continueList('- [ ] milk', 10)).toEqual({ body: '- [ ] milk\n- [ ] ', caret: 17 })
    expect(continueList('- [x] milk', 10)).toEqual({ body: '- [x] milk\n- [ ] ', caret: 17 })
    expect(continueList('- one', 5)).toEqual({ body: '- one\n- ', caret: 8 })
    expect(continueList('1. one', 6)).toEqual({ body: '1. one\n2. ', caret: 10 })
    expect(continueList('- [ ] ', 6)).toEqual({ body: '', caret: 0 })
    expect(continueList('plain', 5)).toBeNull()
    expect(continueList('a\n- b\nc', 7)).toBeNull()
  })

  it('wraps and unwraps bold and italic around the selection', () => {
    expect(applyFormat('make it loud', 8, 12, 'bold')).toEqual({ body: 'make it **loud**', start: 10, end: 14 })
    expect(applyFormat('a **b** c', 2, 7, 'bold')).toEqual({ body: 'a b c', start: 2, end: 3 })
    expect(applyFormat('', 0, 0, 'italic')).toEqual({ body: '*italic*', start: 1, end: 7 })
  })

  it('cycles headings and toggles list and check prefixes on the current line', () => {
    expect(applyFormat('Title', 2, 2, 'heading').body).toBe('# Title')
    expect(applyFormat('# Title', 2, 2, 'heading').body).toBe('## Title')
    expect(applyFormat('### Title', 2, 2, 'heading').body).toBe('Title')
    expect(applyFormat('one\ntwo', 5, 5, 'check').body).toBe('one\n- [ ] two')
    expect(applyFormat('- [x] two', 3, 3, 'check').body).toBe('two')
    expect(applyFormat('- two', 3, 3, 'check').body).toBe('- [ ] two')
    expect(applyFormat('two', 1, 1, 'list').body).toBe('- two')
    expect(applyFormat('- two', 1, 1, 'list').body).toBe('two')
  })
})
