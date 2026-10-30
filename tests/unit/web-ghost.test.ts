import { describe, expect, it } from 'bun:test'
import { CompleterUnavailable, createGhost, type CompletionRequest } from '../../resources/functions/kept/ghost'

function harness(complete: (request: CompletionRequest) => Promise<string>) {
  const timers: Array<() => void> = []
  const shown: string[] = []
  const ghost = createGhost({
    complete: (request) => complete(request),
    onChange: text => shown.push(text),
    delay: 10,
    minChars: 5,
    schedule: (fn) => { timers.push(fn); return timers.length },
    cancel: (handle) => { timers[(handle as number) - 1] = () => {} },
  })
  const fire = async (): Promise<void> => { const fn = timers.pop(); fn?.(); await new Promise(resolve => setTimeout(resolve, 0)) }
  return { ghost, shown, fire }
}

const request = (before: string, after = ''): CompletionRequest => ({ context: '', before, after, kind: 'note' })

describe('ghost text', () => {
  it('shows a completion once typing pauses, and Tab takes it', async () => {
    const { ghost, shown, fire } = harness(async () => ' and more')
    ghost.input(request('hello world'))
    expect(ghost.current()).toBe('')
    await fire()
    expect(ghost.current()).toBe(' and more')
    expect(ghost.accept()).toBe(' and more')
    expect(ghost.current()).toBe('')
    expect(shown).toEqual([' and more', ''])
  })

  it('does not ask too early or in the middle of a line', async () => {
    let asked = 0
    const { ghost, fire } = harness(async () => { asked++; return 'x' })
    ghost.input(request('hey'))
    await fire()
    ghost.input(request('hello world', ' more text'))
    await fire()
    expect(asked).toBe(0)
    ghost.input(request('hello world', '\nnext line'))
    await fire()
    expect(asked).toBe(1)
  })

  it('drops the suggestion the moment you type again, and ignores a late answer', async () => {
    let release: (text: string) => void = () => {}
    const { ghost, fire } = harness(() => new Promise<string>((resolve) => { release = resolve }))
    ghost.input(request('first sentence'))
    await fire()
    ghost.input(request('first sentence plus'))
    release(' stale')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(ghost.current()).toBe('')
  })

  it('Escape dismisses', async () => {
    const { ghost, fire } = harness(async () => ' tail')
    ghost.input(request('some words here'))
    await fire()
    ghost.dismiss()
    expect(ghost.current()).toBe('')
    expect(ghost.accept()).toBe('')
  })

  it('stops asking once the server says it has no such route', async () => {
    let asked = 0
    const { ghost, fire } = harness(async () => { asked++; throw new CompleterUnavailable() })
    ghost.input(request('some words here'))
    await fire()
    ghost.input(request('some words here again'))
    await fire()
    expect(asked).toBe(1)
    expect(ghost.isDisabled()).toBe(true)
  })

  it('caps a runaway answer', async () => {
    const { ghost, fire } = harness(async () => 'a'.repeat(5000))
    ghost.input(request('some words here'))
    await fire()
    expect(ghost.current().length).toBe(400)
  })
})
