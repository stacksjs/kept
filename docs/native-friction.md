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
  transport (`native-library.ts`) now remembers the latest token any response set and
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

## Framework (what was missing in Stacks, stx, Craft and Pantry, and what landed)

Found while making the Mac app a build target. Each entry says what was wrong and
where it was fixed (the fix is at the source, never in this app).

- **No declarative desktop target** (stacks). `config/mobile.ts` described phone
  apps; a native Mac app was a hand-written script (Attic's `build-native.ts` and
  `build-app.ts`). Fixed: `config/desktop.ts` (`DesktopConfig` in `@stacksjs/types`),
  `buddy build:desktop` / `buddy dev:desktop` build and open the AppKit app,
  `buddy desktop:apple:package` makes the sandboxed Store package from the same config.
- **Toolchain pinned by hand** (craft). The AppKit host needs the pinned Zig and the
  zig-js engine; every app copied a lock file and fetched them with sparse git.
  Fixed: `craft-native/macos` resolves them itself (`resolveMacOSToolchain`): Pantry
  installs the exact Zig (it mirrors the dev build), zig-js is fetched at its pinned
  revision and built once into `~/.cache/craft/toolchain`.
- **The host needed a local agent** (craft). It refused to start unless
  `/native/session` answered. Fixed: `--no-session`, and a bundled app reads
  `Contents/Resources/craft-app.json`, so Finder can launch it with no arguments.
- **No Keychain, no session** (craft). `craft.secureStorage`/`craft.session` did not
  exist on the Mac host. Fixed: Keychain-backed `SecureStorage`, `getSync`, and
  `SESSION_CHANGED` across windows; the data-protection keychain is chosen from the
  app's entitlements, not from a failure (a failure-based fallback lost the token on relaunch).
- **Single-line inputs fired no submit or blur** (craft). Fixed.
- **No strike-through, no ghost text, File menu last** (craft). Fixed: `line-through`
  and `underline` on Text; `ghostText` + `accept-completion` on a multi-line TextInput
  (stx knows the prop and event from 0.2.763); a `File` menu is placed first.
- **A Keychain prompt hung the launch of every rebuilt app** (craft, stacks). An ad hoc
  signature changes with each build and the Keychain item trusts the code that wrote it,
  so the next launch stopped on a prompt with no window. Neither `LAContext` nor
  `kSecUseAuthenticationUI` stops a login-keychain prompt; `SecKeychainSetUserInteractionAllowed(false)`
  around the read does (reproduced with an item whose access list trusts no one). Fixed
  in the host, and `build:desktop` now signs with the Mac's Apple Development identity so
  rebuilds stay trusted.
- **Text editing was end-of-text only** (craft, stx). A multi-line TextInput had no caret.
  Fixed: `onSelectionChange` / `selection`, a `markdown` styling mode (headings, bold,
  italic, code, quotes, checklists drawn as Notes would), `ghostText` at the caret, and
  the driver's `key` action (return, tab, escape, arrows) so handlers can be tested.
- **No Escape, no real shadow, fixed sidebar rows** (craft). Fixed: Escape arrives as the
  desktop command `escape`; `shadow-*` draws a layer shadow; `NativeSidebar` takes
  `rowHeight` and `labelFontSize`; a transparent title bar runs content under it.
- **Cross-axis margins ignored, shrink-wrapped Text clipped, sheets sized once** (craft). Fixed, with
  layout fixture checks.
- **The web server could not render native primitives** (stx). `<View>` answered
  `component "view" could not be resolved`. Fixed: the primitives resolve as components
  of last resort (`nativePrimitives` in stx config, on by default; an app's own
  component, a plugin's, and the shared Button/Checkbox/Switch/TextInput/Image/Video
  win). One view source can now be a web page and a native screen.
- **ts-pantry's native pipeline rejected an AppKit app** (pantry). It required
  `index.html` and `craft.json`, and a `--benchmark` run. Fixed: a bundle with
  `native-screen.js` and `craft-app.json` is a valid native app, checked with `--version`.

Still open:

- `config/desktop.ts` has no `menus` or `sidebar` section: menus are set by the screen
  with `craft.desktop.setMenus`, and the sidebar is the `NativeSidebar` primitive. A
  declarative menu bar would need the host to read it before any screen runs.
- No global quick-entry window: Craft has no global hotkey or non-activating panel on
  the Mac host (a global shortcut needs Accessibility, which the sandbox does not allow
  without a user prompt). Quick entry is a field in the window and Cmd+N.
- `--universal` is not supported for the native app (the host is built for the build
  machine's architecture).
- `NativeSidebar` selects one level of items; an area with projects below it is a
  header with items, not a selectable parent.
- The AppKit host has no DatePicker; dates are typed.
