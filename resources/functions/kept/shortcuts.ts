/** What a key press means in the signed-in app. Pure, so the table can be tested without a browser. */
export type Command = 'next' | 'prev' | 'open' | 'complete' | 'new' | 'close' | 'moveUp' | 'moveDown' | 'search' | 'save' | 'quickEntry'

export interface KeyInfo {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  /** The tag of the focused element (lower case) and whether it is contenteditable. */
  tag?: string
  editable?: boolean
  /** The focused element is a button or link, which already owns Space and Enter. */
  actionable?: boolean
  /** A sheet or menu is open. */
  modal?: boolean
}

const TYPING = new Set(['input', 'textarea', 'select'])

export function isTyping(info: Pick<KeyInfo, 'tag' | 'editable'>): boolean {
  return !!info.editable || TYPING.has(info.tag ?? '')
}

export function commandFor(info: KeyInfo): Command | null {
  const mod = !!(info.metaKey || info.ctrlKey)
  const typing = isTyping(info)
  if (info.key === 'Escape') return 'close'
  // Things' Quick Entry: Ctrl+Space, or Cmd+Shift+N where Ctrl+Space is taken by the system.
  if ((info.ctrlKey && info.key === ' ') || (info.metaKey && info.shiftKey && (info.key === 'n' || info.key === 'N'))) return 'quickEntry'
  if (mod && info.key === 'Enter') return 'complete'
  if (mod && (info.key === 's' || info.key === 'S')) return 'save'
  if (mod && (info.key === 'f' || info.key === 'F') && !info.shiftKey) return 'search'
  if (info.modal) return null
  if (info.altKey && info.key === 'ArrowUp') return 'moveUp'
  if (info.altKey && info.key === 'ArrowDown') return 'moveDown'
  if (typing || mod || info.altKey) return null
  switch (info.key) {
    case 'j': case 'ArrowDown': return 'next'
    case 'k': case 'ArrowUp': return 'prev'
    case 'Enter': return info.actionable ? null : 'open'
    case ' ': return info.actionable ? null : 'open'
    case 'n': case 'N': return 'new'
    case '/': return 'search'
    default: return null
  }
}
