const stripMarkdown = (line: string): string => line.replace(/^\s{0,3}(- \[[ xX]\]|#{1,6}|[-*+]|\d+\.)\s+/, '').replace(/[*_`~]/g, '').trim()

/** Notes.app names a note after its first line, and previews the first line after that. */
export function noteTitleAndSnippet(body: string): { title: string, snippet: string } {
  const lines = body.split('\n').map(stripMarkdown).filter(Boolean)
  return { title: (lines[0] ?? '').slice(0, 300), snippet: (lines[1] ?? '').slice(0, 300) }
}
