# Native friction

Framework and host gaps found while building Kept's Mac app. Each entry says
what was tried and what happened, so it can be fixed at the source.

## Screens

- **Keychain token is not found on the next launch** (craft `CraftMacRuntime.swift`,
  `CraftMacKeychain`). An unsigned or ad-hoc build writes `auth.token` to the login
  keychain after `SecItemAdd` returns -34018 on the data-protection keychain. Most likely, on the
  next launch `get` asks the data-protection keychain first, gets "not found" rather
  than -34018, never falls back, and `craft.secureStorage.getSync('auth.token')`
  returns null. Seen: `security find-generic-password -s dev.craft.native.secure -a auth.token`
  finds the item, yet a relaunch shows the sign-in screen. Within one run it works,
  because the fallback flag is then already set. This also means the offline cold
  start (launch from the saved copy with no network) cannot be shown until it is fixed.
- **Single-line TextInput has no submit or blur** (`CraftMacBox`). Only the
  multiline `NSTextView` fires `onSubmitEditing`; an `NSTextField` gets no
  `control(_:textView:doCommandBy:)` or `controlTextDidEndEditing`, so `@submit`
  and `@blur` never fire. Kept uses `:multiline="true"` one-line inputs for Return
  (quick entry, checklist) and debounced saves instead of save-on-blur.
- **A sheet is sized once, when it appears** (`CraftMacRenderer.render`, Modal).
  Rows added afterwards are clipped. Kept loads history and sharing before opening
  their sheets and gives the share sheet a minimum height.
- **Cross-axis margins are ignored** (`CraftMacFlow.layoutBoxes`): `mx-4` on a
  child of a column has no effect, only the main-axis start and end margins do.
  Kept wraps such rows in a padded View.
- **Shrink-wrapped Text clips its last word** (`CraftMacBox.measure`): a Text in
  an `items-center` column is measured a few points narrower than the wrapping
  `NSTextField` needs, wraps, and the measured one-line height hides the second
  line ("Sign in to Kept" drew as "Sign in"). Stretching the Text avoids it.
- **A component prop named like the caller's loop variable is empty**: with
  `<Row :for="todo in items" :todo="todo" />`, `useReactiveProp('todo')` inside
  `Row` never saw a value and every binding in the component stayed blank, with no
  error. Renaming the prop (`:item="todo"`) fixed it.
- **Template handlers receive a signal's value, not the signal**: `@input="edit(dTitle, $event)"`
  passed a string, so `field.set` threw (`[STX] Handler error ... field.set is not a function`,
  only in stderr). Kept names fields with strings instead.
- **Mustaches inside a screen's script are template syntax**: a string literal
  `'Write about {{topic}}.'` in `<script client>` was replaced with `undefined`.
  Kept keeps such strings in a TypeScript module.
- **No text decoration on Mac Text**: `line-through` is not applied, so finished
  to-dos are shown in the secondary label colour instead of struck through.
- **Custom menus go after Edit**: `setMenus` inserts File, View and Item between
  Edit and Window, so File is not the first menu after the app menu as on a
  standard Mac app.
- **No DatePicker on the Mac host** (`Unsupported native control`): dates are
  typed as `YYYY-MM-DD` (or `tomorrow`).
- **Sheets are not in the driver's screenshot**: `screenshot` renders the window's
  content view only; a sheet shows as the dimmed parent. `screencapture -l <window id>`
  captures it.
