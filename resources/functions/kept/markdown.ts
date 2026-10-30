import { safe } from './safe'

/**
 * Just enough Markdown for notes and to-do notes: headings, bold, italic,
 * inline code, links, lists and `- [ ]` check lines. Input is escaped first and
 * only these constructs are turned back into tags, so rendering a stranger's
 * shared prompt cannot inject markup.
 */
const escapeHtml = (text: string): string =>
  safe(text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'))

const safeUrl = (url: string): boolean => /^(https?:\/\/|mailto:)/i.test(url)

export function inline(text: string, notes = false): string {
  let out = escapeHtml(text)
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\w)/g, '$1<em>$2</em>')
  out = out.replace(/(^|[^_\w])_([^_\s][^_]*)_(?!\w)/g, '$1<em>$2</em>')
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label: string, url: string) =>
    safeUrl(url.replace(/&amp;/g, '&')) ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>` : whole)
  if (notes) {
    out = out.replace(/\[\[([^\]\n]{1,200})\]\]/g, (_whole, title: string) => `<a href="#" class="md-note-link" data-note-link="${title.trim()}">${title.trim()}</a>`)
    out = out.replace(/(^|[\s(>])#([\p{L}\p{N}_-]+)/gu, (_whole, lead: string, tag: string) => `${lead}<a href="#" class="md-tag" data-tag="${tag.toLowerCase()}">#${tag}</a>`)
  }
  return out
}

const CHECK = /^(\s*)[-*+]\s+\[([ xX])\]\s?(.*)$/
const BULLET = /^(\s*)[-*+]\s+(.*)$/
const NUMBERED = /^(\s*)\d+[.)]\s+(.*)$/
const HEADING = /^(#{1,3})\s+(.*)$/

/**
 * Render the body to HTML. Check lines become buttons that carry `data-line`,
 * the zero-based line of the source, so a click can flip exactly that line
 * with `toggleCheckLine`.
 */
export function renderMarkdown(body: string, notes = false): string {
  const lines = body.split('\n')
  const out: string[] = []
  let list: 'ul' | 'ol' | 'checks' | null = null
  const close = (): void => {
    if (list === 'ol') out.push('</ol>')
    else if (list) out.push('</ul>')
    list = null
  }
  const open = (kind: 'ul' | 'ol' | 'checks'): void => {
    if (list === kind) return
    close()
    list = kind
    out.push(kind === 'ol' ? '<ol>' : kind === 'ul' ? '<ul>' : '<ul class="md-checks">')
  }
  lines.forEach((line, index) => {
    const check = CHECK.exec(line)
    if (check) {
      open('checks')
      const done = check[2] !== ' '
      out.push(`<li class="md-check${done ? ' is-done' : ''}"><button type="button" role="checkbox" aria-checked="${done}" aria-label="${done ? 'Mark not done' : 'Mark done'}" data-line="${index}" class="md-box"></button><span>${inline(check[3] ?? '', notes)}</span></li>`)
      return
    }
    const bullet = BULLET.exec(line)
    if (bullet) { open('ul'); out.push(`<li>${inline(bullet[2] ?? '', notes)}</li>`); return }
    const numbered = NUMBERED.exec(line)
    if (numbered) { open('ol'); out.push(`<li>${inline(numbered[2] ?? '', notes)}</li>`); return }
    close()
    const heading = HEADING.exec(line)
    if (heading) { out.push(`<h${heading[1]!.length + 1}>${inline(heading[2] ?? '', notes)}</h${heading[1]!.length + 1}>`); return }
    if (!line.trim()) { out.push('<div class="md-gap"></div>'); return }
    out.push(`<p>${inline(line, notes)}</p>`)
  })
  close()
  return out.join('')
}

/** Flip the `- [ ]` / `- [x]` marker on one line of the source. Other lines are left alone. */
export function toggleCheckLine(body: string, line: number): string {
  const lines = body.split('\n')
  const current = lines[line]
  if (current === undefined) return body
  lines[line] = current.replace(/^(\s*[-*+]\s+)\[([ xX])\]/, (_whole, lead: string, mark: string) => `${lead}[${mark === ' ' ? 'x' : ' '}]`)
  return lines.join('\n')
}

/** How many check lines are done and how many there are, for a "2 of 3" summary. */
export function checkProgress(body: string): { done: number, total: number } {
  let done = 0
  let total = 0
  for (const line of body.split('\n')) {
    const match = CHECK.exec(line)
    if (!match) continue
    total++
    if (match[2] !== ' ') done++
  }
  return { done, total }
}

/**
 * Continue a list when Enter is pressed at the end of a list line, like Notes.app:
 * `- [ ] milk` + Enter starts `- [ ] `; an empty list line + Enter ends the list.
 * Returns the new text and caret, or null when the line is not a list line.
 */
export function continueList(body: string, caret: number): { body: string, caret: number } | null {
  const start = body.lastIndexOf('\n', caret - 1) + 1
  const line = body.slice(start, caret)
  const check = /^(\s*[-*+]\s+)\[[ xX]\]\s?(.*)$/.exec(line)
  const bullet = /^(\s*[-*+]\s+)(.*)$/.exec(line)
  const numbered = /^(\s*)(\d+)([.)]\s+)(.*)$/.exec(line)
  let marker: string
  let rest: string
  if (check) { marker = `${check[1]}[ ] `; rest = check[2] ?? '' }
  else if (bullet) { marker = bullet[1] ?? ''; rest = bullet[2] ?? '' }
  else if (numbered) { marker = `${numbered[1]}${Number(numbered[2]) + 1}${numbered[3]}`; rest = numbered[4] ?? '' }
  else return null
  if (!rest.trim()) {
    // An empty item: Enter ends the list by removing the marker.
    const next = body.slice(0, start) + body.slice(caret)
    return { body: next, caret: start }
  }
  const inserted = `\n${marker}`
  return { body: body.slice(0, caret) + inserted + body.slice(caret), caret: caret + inserted.length }
}

export type Format = 'bold' | 'italic' | 'heading' | 'check' | 'list'
export interface Edit { body: string, start: number, end: number }

/** The start and end offsets of the line containing `at`. */
function lineBounds(body: string, at: number): [number, number] {
  const start = body.lastIndexOf('\n', at - 1) + 1
  const next = body.indexOf('\n', at)
  return [start, next < 0 ? body.length : next]
}

/** Apply a toolbar or keyboard format to the selection, the way Notes.app's format menu does. */
export function applyFormat(body: string, start: number, end: number, kind: Format): Edit {
  if (kind === 'bold' || kind === 'italic') {
    const mark = kind === 'bold' ? '**' : '*'
    const chosen = body.slice(start, end)
    const wrapped = chosen.startsWith(mark) && chosen.endsWith(mark) && chosen.length >= mark.length * 2
    if (wrapped) {
      const inner = chosen.slice(mark.length, chosen.length - mark.length)
      return { body: body.slice(0, start) + inner + body.slice(end), start, end: start + inner.length }
    }
    const text = chosen || (kind === 'bold' ? 'bold' : 'italic')
    return { body: `${body.slice(0, start)}${mark}${text}${mark}${body.slice(end)}`, start: start + mark.length, end: start + mark.length + text.length }
  }
  const [from, to] = lineBounds(body, start)
  const line = body.slice(from, to)
  let next: string
  if (kind === 'heading') {
    const match = /^(#{1,3})\s+/.exec(line)
    const level = match ? match[1]!.length : 0
    const rest = match ? line.slice(match[0].length) : line
    next = level >= 3 ? rest : `${'#'.repeat(level + 1)} ${rest}`
  }
  else if (kind === 'check') {
    if (/^\s*[-*+]\s+\[[ xX]\]\s?/.test(line)) next = line.replace(/^(\s*)[-*+]\s+\[[ xX]\]\s?/, '$1')
    else if (/^\s*[-*+]\s+/.test(line)) next = line.replace(/^(\s*)[-*+]\s+/, '$1- [ ] ')
    else next = `- [ ] ${line}`
  }
  else {
    next = /^\s*[-*+]\s+/.test(line) && !/^\s*[-*+]\s+\[[ xX]\]/.test(line) ? line.replace(/^(\s*)[-*+]\s+/, '$1') : `- ${line.replace(/^\s*[-*+]\s+(\[[ xX]\]\s?)?/, '')}`
  }
  const caret = Math.min(from + next.length, from + next.length)
  return { body: body.slice(0, from) + next + body.slice(to), start: caret, end: caret }
}
