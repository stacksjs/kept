# Native friction

Framework and host gaps found while building Library's Mac app. Each entry says
what was tried and what happened, so it can be fixed at the source.

## Screens

### Open

- **The host reports no caret or selection.** Notes formatting (Title, Heading,
  Bold, Italic, List, Checklist) and inline completions act on the end of the text,
  because `onChangeText` carries only the text. A selection range in the event and
  a way to set it would let formatting wrap the selection and completions follow the
  caret.
- **Rendering cost per bound node is high in zig-js.** Swapping the to-do list for
  Upcoming (about 130 nodes) takes about 0.7 s, All Notes (about 180) about 1.3 s,
  measured from the command to the text appearing in `state.json`. Each component
  instance costs about 80 to 100 ms, so rows are drawn inline instead of as
  components. A false `:if` that holds components or a loop is still built (stx
  skips deferring those), so per-row branches became `display` toggles and the
  in-place editor is drawn once between two loops.
- **No shadow on Mac views.** The open to-do card has a hairline border instead of
  Things' soft shadow.
- **Sidebar rows are 32 pt with 13 pt labels**, set by the host's `NSOutlineView`;
  Things uses 24 pt rows with 15 pt labels. A row height and font size prop on
  `NativeSidebar` would close it.
- **The window has a standard title bar.** Things draws its traffic lights inside
  the sidebar (`titlebarStyle: transparent`, full-size content); that is
  `craft-app.json`'s setting.
- **The test driver cannot press keys.** Return, Tab (accepting ghost text) and
  Escape can only be checked by hand or through computer use.

### Fixed in the host (verified)

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
