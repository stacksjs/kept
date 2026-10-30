import { describe, expect, it } from 'bun:test'
import { inline, renderMarkdown } from '../../resources/functions/kept/markdown'
import { safe } from '../../resources/functions/kept/safe'

const matcher = /\{\{[\s\S]+?\}\}/

describe('safe', () => {
  it('leaves nothing for the template runtime to evaluate', () => {
    expect(matcher.test('Write {{tone}} now')).toBe(true)
    expect(matcher.test(safe('Write {{tone}} now'))).toBe(false)
    expect(matcher.test(safe('{{ alert(1) }}'))).toBe(false)
  })

  it('keeps the text readable and handles empty values', () => {
    expect(safe('a {{b}} c').replace(/​/g, '')).toBe('a {{b}} c')
    expect(safe(null)).toBe('')
    expect(safe(undefined)).toBe('')
    expect(safe(12)).toBe('12')
  })

  it('is applied to rendered markdown too', () => {
    expect(matcher.test(inline('use {{name}} here'))).toBe(false)
    expect(matcher.test(renderMarkdown('# {{title}}\n- [ ] {{todo}}'))).toBe(false)
  })
})
