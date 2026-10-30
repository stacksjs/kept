import type { Prompt } from './types'

export type Segment = { text: string, variable: boolean }

/** Split a prompt body into plain text and `{{variable}}` chips, so the editor and Use sheet can colour the placeholders. */
export function segments(body: string): Segment[] {
  const out: Segment[] = []
  let last = 0
  for (const match of body.matchAll(/\{\{\s*([A-Za-z_][\w.-]*)\s*\}\}/g)) {
    const at = match.index ?? 0
    if (at > last) out.push({ text: body.slice(last, at), variable: false })
    out.push({ text: match[0], variable: true })
    last = at + match[0].length
  }
  if (last < body.length) out.push({ text: body.slice(last), variable: false })
  return out
}

/** The same split with the placeholders replaced by what was typed, filled ones marked so the result can be shown highlighted. */
export function filledSegments(body: string, values: Record<string, string>): Segment[] {
  return segments(body).map((segment) => {
    if (!segment.variable) return segment
    const name = /\{\{\s*([^}\s]+)\s*\}\}/.exec(segment.text)?.[1] ?? ''
    const value = values[name]
    return value ? { text: value, variable: true } : segment
  })
}

export function filterPrompts(prompts: Prompt[], search: string, favoritesOnly: boolean): Prompt[] {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean)
  return prompts.filter((prompt) => {
    if (favoritesOnly && !prompt.favorite) return false
    if (!words.length) return true
    const text = `${prompt.title} ${prompt.description} ${prompt.body} ${prompt.tags.join(' ')}`.toLowerCase()
    return words.every(word => text.includes(word))
  })
}

/** The server stores tags as a JSON string and favourites as 0 or 1. */
export function normalizePrompt(raw: Record<string, unknown>): Prompt {
  return {
    ...(raw as unknown as Prompt),
    description: String(raw.description ?? ''),
    body: String(raw.body ?? ''),
    model: String(raw.model ?? ''),
    tags: Array.isArray(raw.tags) ? (raw.tags as unknown[]).map(String) : [],
    favorite: Boolean(raw.favorite),
    variables: Array.isArray(raw.variables) ? (raw.variables as unknown[]).map(String) : [],
  }
}

/** Library colours the picker offers: all pass AA as an icon tint on both surfaces. */
export const LIBRARY_COLORS = ['#1f6bff', '#0f8a5f', '#c2410c', '#a21caf', '#be123c', '#475569'] as const
export const LIBRARY_ICONS = ['i-hugeicons-book-02', 'i-hugeicons-pen-tool-03', 'i-hugeicons-code', 'i-hugeicons-bulb', 'i-hugeicons-message-01', 'i-hugeicons-search-01'] as const

/** The URL a public link opens, from where the app is served. */
export function publicLinkUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/p/${token}`
}
