/**
 * Ghost-text completions, the grey continuation that appears after the caret
 * while you write. The controller owns the timing and the rules; where the text
 * comes from is a `Completer`, so the server route (POST /api/complete) and a
 * stub for development plug into the same place.
 *
 *   Tab accepts, Esc dismisses, typing anything replaces it.
 */
export type CompletionKind = 'note' | 'prompt' | 'todo'

export interface CompletionRequest {
  /** What the text is about: the note's folder, the prompt's library and model hint. */
  context: string
  /** Everything before the caret. */
  before: string
  /** Everything after the caret. */
  after: string
  kind: CompletionKind
}

export type Completer = (request: CompletionRequest, signal: AbortSignal) => Promise<string>

/** The completer tells the controller the feature is not there (no route, not allowed), so it stops asking. */
export class CompleterUnavailable extends Error {}

export interface GhostOptions {
  complete: Completer
  onChange: (completion: string) => void
  /** Wait this long after the last keystroke before asking. */
  delay?: number
  /** Do not ask until there is this much to continue from. */
  minChars?: number
  /** Cap on what is shown, so a runaway answer cannot fill the page. */
  maxChars?: number
  schedule?: (fn: () => void, ms: number) => unknown
  cancel?: (handle: unknown) => void
}

export function createGhost(options: GhostOptions) {
  const delay = options.delay ?? 450
  const minChars = options.minChars ?? 12
  const maxChars = options.maxChars ?? 400
  const schedule = options.schedule ?? ((fn, ms) => setTimeout(fn, ms))
  const cancel = options.cancel ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>))
  let timer: unknown = null
  let controller: AbortController | null = null
  let current = ''
  let turn = 0
  let disabled = false

  const show = (text: string): void => { current = text; options.onChange(text) }

  function dismiss(): void {
    turn++
    if (timer !== null) { cancel(timer); timer = null }
    controller?.abort()
    controller = null
    if (current) show('')
  }

  /** The caret has to be at the end of a line: ghost text pushed into the middle of a paragraph would shift real text. */
  const atLineEnd = (after: string): boolean => after === '' || after.startsWith('\n')

  function input(request: CompletionRequest): void {
    dismiss()
    if (disabled || !atLineEnd(request.after) || request.before.trim().length < minChars) return
    const mine = turn
    timer = schedule(async () => {
      timer = null
      controller = new AbortController()
      try {
        const text = await options.complete(request, controller.signal)
        if (mine !== turn || !text) return
        show(text.replace(/^\s+$/, '').slice(0, maxChars))
      }
      catch (cause) {
        if (cause instanceof CompleterUnavailable) disabled = true
      }
    }, delay)
  }

  /** Take the completion, clearing it. Empty when there is none. */
  function accept(): string {
    const text = current
    dismiss()
    return text
  }

  return { input, accept, dismiss, current: () => current, isDisabled: () => disabled }
}
