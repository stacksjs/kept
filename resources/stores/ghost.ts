import { defineStore, state } from '@stacksjs/stx'
import { pickCompleter } from '../functions/kept/complete'
import { createGhost, type CompletionKind } from '../functions/kept/ghost'

/**
 * The one ghost-text controller the editors share (only one field has the caret
 * at a time). An editor calls `track` after each edit and `take` on Tab;
 * `<GhostText>` draws what is here.
 */
defineStore('ghost', () => {
  const text = state('')
  /** Everything before the caret, so the overlay can place the grey text right after it. */
  const before = state('')
  const scrollTop = state(0)
  const ghost = createGhost({ complete: pickCompleter(), onChange: value => text.set(value) })

  /** Call after an edit with the textarea that was edited. */
  function track(kind: CompletionKind, context: string, field: HTMLTextAreaElement): void {
    const caret = field.selectionStart ?? field.value.length
    before.set(field.value.slice(0, caret))
    scrollTop.set(field.scrollTop)
    ghost.input({ kind, context, before: field.value.slice(0, caret), after: field.value.slice(caret) })
  }

  /** Tab: the completion, or '' when there is none (so Tab keeps its normal meaning). */
  const take = (): string => ghost.accept()
  const dismiss = (): void => ghost.dismiss()

  return { text, before, scrollTop, track, take, dismiss }
})
