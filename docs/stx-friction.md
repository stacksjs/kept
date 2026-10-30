# stx and Stacks friction log

Things that made the web app harder than it should have been while it was built, with what was tried, what broke, and the fix that would remove the problem. Versions: `@stacksjs/stx` 0.2.752, Bun 1.4.4. Each entry says whether a workaround is in the code.

## 1. Text a binding writes is evaluated as a template expression (security)

Tried: showing a to-do titled `{{ 1 + 1 }}` and a shared prompt whose body contains `{{count}}` through `:text`.
Broke: the browser runtime scans text nodes for `{{ expr }}` after `:text` / `:html` has written them, evaluates the expression against the page scope and shows the result (`0`, `[object Object]`). A stranger's shared prompt can therefore run an expression in a reader's page.
Want: bindings must never re-scan their own output. `:text` and `:html` should write inert text, and the scan should only apply to authored template text.
Workaround: `resources/functions/kept/safe.ts` puts a zero-width space between the braces, and every user-supplied string passes through it on its way to a binding (and `escapeHtml` in the Markdown renderer does the same). Covered by `tests/unit/web-safe.test.ts`.

## 2. A literal `{{` anywhere in a template attribute is compiled as a mustache

Tried: `:text="'{{' + name + '}}'"` to draw a variable chip, and `placeholder="Use {{name}} ..."`.
Broke: the compiler read the pair of braces inside the quoted JavaScript string and the placeholder as a mustache and evaluated it (`name` is undefined at the page level).
Want: no mustache parsing inside a binding expression's string literals, and an escape that works in attributes too.
Workaround: build the braces from pieces in script (`'{' + '{'`), reword the placeholder.

## 3. `layoutsDir: 'layouts'` resolves to `resources/views/layouts`, not `resources/layouts`

Tried: `resources/layouts/kept.stx` with `@extends('layouts/kept')` and `@extends('kept')`, as AGENTS.md and `config/ui.ts` describe (`root: 'resources'`).
Broke: `Layout not found: layouts/kept ... Available layouts: 403, 404, default, maintenance, storefront`. Only `resources/views/layouts/*.stx` is scanned. Components in `resources/components` do resolve.
Want: honour `layoutsDir` relative to `root`, or fix the docs and the scaffold comment. The error should print the directories it looked in.
Workaround: the layout lives in `resources/views/layouts/shell.stx`.

## 4. Import aliases are dropped in the auto-bundled store files

Tried: `import { api, today as deviceDay } from '../functions/kept/client'` in `resources/stores/tasks.ts`, with a local `const today = state(...)`.
Broke: in the browser `ReferenceError: deviceDay is not defined` (the alias was removed from the import) and `Uncaught SyntaxError: Identifier 'today' has already been declared`.
Want: bundle stores with a real bundler pass that keeps `as` aliases, or reject them with a compile error.
Workaround: export a differently named function and import it without an alias.

## 5. Every component root is wrapped in `<div data-stx-component-wrapper>`

Tried: components whose root is a grid or flex child (`<div class="k-pane">`).
Broke: the wrapper becomes the grid item, so `grid-template-columns` and `.parent > .child` selectors stop matching and an empty wrapper takes a track.
Want: a documented way to render without a wrapper, or render the wrapper with `display: contents` by default.
Workaround: `[data-stx-component-wrapper] { display: contents }` in the layout.

## 6. Icon classes passed as component props are not turned into CSS

Tried: `<MoreMenu icon="i-hugeicons-settings-02">`, `<EmptyState icon="i-hugeicons-note-01">` and library icons stored in the database.
Broke: ts-css only generated the icon CSS when the class name appears in a `class="..."` attribute or a string in a script; a prop attribute is not scanned, so the icon rendered as an empty box (`mask-image: none`). Dynamic icons from data can never work.
Want: scan every attribute value, and a `safelist` option in `config/css.ts` for names that only exist at runtime.
Workaround: icons chosen by props are mapped through literal class strings in the component's script (`kind="settings"`), and library icons are validated and fall back to a default.

## 7. `:data-x="true"` renders `data-x=""`

Tried: `:data-open="isOpen"` with the CSS `[data-open='true']`.
Broke: a boolean `true` is written as an empty attribute, so the selector never matched, while `aria-*` bindings need the strings `'true'` and `'false'`.
Want: render booleans on `data-*` and `aria-*` as `"true"`/`"false"`, or warn.
Workaround: bindings return explicit strings.

## 8. `:for` rows are expensive (about 5 ms and 50 DOM mutations per row)

Measured (a to-do row has ten elements and about six bindings; 3000 to-dos in the store, 60 rows drawn): the main thread is blocked for about 500 ms when the list changes, and about 100 ms for a list of two rows. A `setInterval(4ms)` gap probe was used, because `requestAnimationFrame` is throttled to 1 Hz in the preview pane.
Want: a cheaper keyed list primitive (reuse nodes, batch attribute writes) and a built-in `useVirtualList` composable.
Workaround: lists draw 40 rows and grow by 40 as you scroll (`tasks.more()`), `content-visibility: auto` on rows, one `data-state` attribute per row instead of four, one loop for the chips. Still the slowest part of the app.

## 9. Every file in `resources/stores` is bundled into every page

`/login` and the public `/p/<token>` page download and run all five stores. Want: ship a store only to the pages that call `useStore('name')`.

## 10. Component scripts share the page scope, so names must be hand-prefixed

Every `const` in a component script needs a unique prefix (`tg`, `te`, `sb`) or it collides with the page and its sibling components. Want: scope component scripts, or a compile error that names both declarations.

## 11. No solid icons in hugeicons; the Things-style list glyphs need them

The Things reference uses filled, coloured glyphs (star, tray, calendar, layers, archive box, logbook). `@iconify-json/hugeicons` has outline icons only, so those six glyphs and the This Evening moon use `i-f7-*`. `@iconify-json/f7` is present only as a transitive install, so it should be declared as a dependency, or hugeicons needs a solid set. Everything else is hugeicons.

## 12. Two colour-mode mechanisms

`@appearanceBootstrap` stores JSON under its own key and `useColorMode` / `useDark` store a plain string under `stx-color-mode`. The app uses both and it works, but which one wins on first paint is not documented. Want: one persisted key and one documented bootstrap.

## 13. A component file replaced after the server saw a stub keeps serving the stub

Created `NoteList.stx` as a one-line stub, then overwrote it. The page kept rendering the stub until the file was touched again. Want: the watcher should compare content, not only creation.

## 14. `buddy dev` stops when started detached

`nohup ./buddy dev --frontend &` prints `stacks started with no parent to watch (ppid 1) - stopping this dev process`. Changing `config/server.ts` (proxy paths) also took the frontend server down, and it had to be started again. Want: a `--detach` flag that is allowed to outlive its parent, and a hot reload for the proxy config.

## 15. `x-model` cannot bind a store property

`x-model="store.draft"` is not writable; only a bare local signal works. Each form field therefore needs a local signal plus an effect to push it into the store. Want: allow `x-model` on any signal-valued expression.

## 16. `useStore(name)` is untyped

Stores come back as `any`, so none of the store API is checked in `.stx` files or in the other stores. Want: a typed registry (`useStore<typeof tasksStore>` or module augmentation from `defineStore`).
