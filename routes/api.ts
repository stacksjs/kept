import { response, route } from '@stacksjs/router'

/**
 * This file is the entry point for your application's API routes.
 * The routes defined here are automatically registered. Last but
 * not least, you may also create any other `routes/*.ts` files.
 *
 * Every route in this file is mounted under `/api`. The prefix comes from
 * the `'api'` key in `app/Routes.ts` and lines up with the path the dev
 * proxy forwards (`/api/*`), so `route.get('/hello', ...)` below answers
 * `GET /api/hello`. Paths at the document root belong in a route file
 * whose registry entry sets `prefix: ''`.
 *
 * Framework routes (auth, dashboard, commerce, CMS, etc.) are loaded
 * automatically from storage/framework/defaults/routes/dashboard.ts.
 * You do NOT need to define them here — only add your own custom routes.
 *
 * @see https://docs.stacksjs.com/routing
 */

// Your custom routes go here. This one answers `GET /api/hello`:
route.get('/hello', () => response.text('hello world'))

// `/coming-soon` is served as an STX view from
// `storage/framework/defaults/resources/views/coming-soon.stx`. The
// view auto-resolves through stx-serve, so no route registration is
// needed here. To activate the holding page across the whole app:
//
//   ./buddy coming-soon [--secret=my-magic-token]
//
// Launch the site with `./buddy launch`. Maintenance mode (503 page,
// distinct cookie + state file) is the separate `./buddy down` /
// `./buddy up` pair.

// Library: smart lists, completing and reopening to-dos, notes, and prompt libraries.
// The generated CRUD routes (todos, projects, areas, ...) come from each model's
// `useApi` trait; these are the ones with rules of their own.
route.get('/sidebar', 'Actions/Lists/SidebarAction').middleware('auth')
route.get('/lists/{list}', 'Actions/Lists/ListShowAction').middleware('auth')
route.post('/todos/{id}/complete', 'Actions/Todos/CompleteTodoAction').middleware('auth')
route.post('/todos/{id}/reopen', 'Actions/Todos/ReopenTodoAction').middleware('auth')

// Fixed segments first: `/notes/trash` must not be read as a note id.
route.get('/notes/trash', 'Actions/Notes/NoteTrashAction').middleware('auth')
route.post('/notes/{id}/restore', 'Actions/Notes/NoteRestoreAction').middleware('auth')
route.delete('/notes/{id}/purge', 'Actions/Notes/NotePurgeAction').middleware('auth')
route.post('/notes', 'Actions/Notes/NoteSaveAction').middleware('auth')
route.put('/notes/{id}', 'Actions/Notes/NoteSaveAction').middleware('auth')

route.get('/prompt-libraries', 'Actions/Prompts/LibraryIndexAction').middleware('auth')
route.get('/prompt-libraries/{id}/prompts', 'Actions/Prompts/PromptIndexAction').middleware('auth')
route.get('/prompts', 'Actions/Prompts/PromptIndexAction').middleware('auth')
route.post('/prompts', 'Actions/Prompts/PromptSaveAction').middleware('auth')
route.put('/prompts/{id}', 'Actions/Prompts/PromptSaveAction').middleware('auth')
route.post('/prompts/{id}/use', 'Actions/Prompts/PromptUseAction').middleware('auth')
route.get('/prompts/{id}/versions', 'Actions/Prompts/PromptVersionsAction').middleware('auth')

route.get('/prompt-libraries/{id}/shares', 'Actions/Shares/LibraryShareIndexAction').middleware('auth')
route.post('/prompt-libraries/{id}/shares', 'Actions/Shares/LibraryShareCreateAction').middleware('auth')
route.post('/prompt-libraries/{id}/link', 'Actions/Shares/LibraryLinkAction').middleware('auth')
// Opened from a link anyone can hold: read-only, no account.
route.get('/shared/{token}', 'Actions/Shares/SharedLibraryAction')

// Ghost-text completions for the note, prompt and to-do editors: the framework's
// default action, mounted here as POST /api/complete. Answers { completion }, or
// '' when no AI driver is configured, so the editors stay quiet without one.
route.post('/complete', 'Actions/AI/CompleteAction').middleware('auth')
