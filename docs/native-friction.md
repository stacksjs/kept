# Native friction

Framework and host gaps found while building Library's Mac app. Each entry says
what was tried and what happened, so it can be fixed at the source.

## Screens

### Open

- **Escape reaches no screen handler.** The driver's `key escape` sends
  `cancelOperation:`, but the host fires no event for it on a text input or a
  sheet, so Escape cannot close the open to-do or a sheet. An `@cancel` (or
  `@key-press` with the key) event would close it.
- **`titlebarStyle: transparent` hides the title but the content does not run
  under the bar** (no `.fullSizeContentView`): the sidebar's vibrancy stops below a
  white band and the traffic lights sit over that band. Not closer to Things until
  the content runs under the bar.
- **Rendering cost per bound node is high in zig-js.** Swapping the to-do list for
  Upcoming (about 130 nodes) takes about 0.7 s, All Notes (about 180) about 1.3 s.
  Each component instance costs about 80 to 100 ms, so rows are drawn inline. A
  false `:if` that holds components or a loop is still built, so per-row branches
  are `display` toggles and the open to-do is drawn once between two loops.
- **`POST /api/complete` answers 500** (`Cannot find module .../Actions/AI/CompleteAction.ts`
  under `@stacksjs/defaults`). Ghost text fails silently and pauses for five
  minutes; it was verified against a local stand-in that returns a fixed completion.
- **The CSRF token `createApi` keeps goes stale after a sign-out** (`api.ts` seeds it
  once; signing out rotates the cookie, and the server mints a new one only for a
  request without one). Signing in again then got 403 Forbidden. The native
  transport (`native-kept.ts`) now remembers the latest token any response set and
  uses it for posts made before sign-in; the shared client would be the better home.

### Fixed in the host (verified)

- Caret and selection (`@selection-change`, `:selection`): formatting acts on the
  caret line or the selection, and completions use the text around the caret.
- `markdown` on multi-line TextInput: notes, prompt bodies and to-do notes draw
  headings, bold, italic, code, quotes, lists and struck-through done items.
- `NativeSidebar rowHeight="24" labelFontSize="15"` matches Things' sidebar.
- `shadow-md` draws a real shadow: the open to-do card matches Things.
- The driver's `key` action: Return in quick entry, a checklist field and a to-do
  title, and Tab accepting a ghost completion, all verified.

- The Keychain token survives a relaunch, a Keychain read can no longer block on a
  permission prompt, and development builds are signed with a stable identity so a
  rebuild no longer asks again. (Ad-hoc builds used to hang on a SecurityAgent
  prompt after every rebuild.)
- Single-line TextInput fires `onSubmitEditing` and `onBlur`; Return in a to-do's
  title, a checklist field or the share email acts without one-line multiline
  workarounds.
- `textDecorationLine: line-through` draws on Mac Text: finished to-dos and check
  lines are struck through.
- A custom "File" menu comes first after the app menu.
- `ghostText` on a multi-line TextInput draws after the caret, and the bundle maps
  `@accept-completion` to `onAcceptCompletion`.
- Cross-axis margins, the shrink-wrapped Text measure, and sheets that follow their
  content height (the share sheet's minimum height and the padded wrappers were
  removed).

### Template traps

- A component prop named like the caller's `:for` variable stays empty
  (`<Row :for="todo in items" :todo="todo" />`); name the prop differently.
- Template handlers receive a signal's value, not the signal: name fields with
  strings (`editTodo('title', $event)`).
- `{{ }}` inside a string in a screen's `<script client>` is template syntax and
  becomes `undefined`; keep such strings in a TypeScript module.
- The test driver's screenshot covers the window's content view only; a sheet shows
  as the dimmed parent. `screencapture -l <window id>` captures it.
