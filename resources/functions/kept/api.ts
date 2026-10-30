/**
 * Kept's API client, shared by the web app and the native Mac app.
 *
 * One module owns every request so the two clients cannot drift: the shapes in
 * `types.ts`, the CSRF handshake for unauthenticated posts, the bearer token
 * for everything after sign-in, and the error type screens catch. It touches no
 * DOM and no Craft bridge: where the token lives (a cookie-less web store, the
 * macOS Keychain) is the caller's `session`.
 */
import type { Area, ChecklistItem, LibraryList, Note, NoteFolder, Project, Prompt, PromptVersion, SharedLibrary, Share, SidebarData, Todo, TodoList } from './types'

export interface Session {
  /** The bearer token, or null when signed out. */
  token: () => string | null
  save: (token: string | null) => void
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string, readonly body?: unknown) {
    super(message)
  }
}

export interface ApiOptions {
  /** Origin of the Kept server, e.g. `https://kept.stacksjs.com`. Empty for same-origin web. */
  base?: string
  session: Session
  fetch?: typeof fetch
  /** Called when the server says the token is no longer good. */
  onSignedOut?: () => void
}

const day = (date = new Date()): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** The device's calendar day, which is what "Today" means. */
export const today = day

export function createApi(options: ApiOptions) {
  const http = options.fetch ?? fetch
  const base = (options.base ?? '').replace(/\/+$/, '')
  let csrf = ''

  async function seedCsrf(): Promise<void> {
    if (csrf) return
    const res = await http(`${base}/me`, { headers: { accept: 'application/json' } })
    csrf = /X-CSRF-Token=([0-9a-f]+)/.exec(res.headers.get('set-cookie') ?? '')?.[1]
      ?? document?.cookie?.match?.(/X-CSRF-Token=([0-9a-f]+)/)?.[1]
      ?? ''
  }

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { accept: 'application/json' }
    if (body !== undefined) headers['content-type'] = 'application/json'
    const token = options.session.token()
    if (token) headers.authorization = `Bearer ${token}`
    else if (method !== 'GET') {
      await seedCsrf()
      if (csrf) { headers['x-csrf-token'] = csrf; headers.cookie = `X-CSRF-Token=${csrf}` }
    }
    const res = await http(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    const text = await res.text()
    let json: unknown = null
    try { json = text ? JSON.parse(text) : null } catch { json = text }
    if (res.status === 401 && token) { options.session.save(null); options.onSignedOut?.() }
    if (!res.ok) {
      const message = (json as { error?: string, message?: string } | null)?.error ?? (json as { message?: string } | null)?.message ?? `Request failed (${res.status})`
      throw new ApiError(res.status, message, json)
    }
    return json as T
  }

  const get = <T>(path: string) => request<T>('GET', path)
  const post = <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {})
  const put = <T>(path: string, body: unknown) => request<T>('PUT', path, body)
  const del = <T>(path: string) => request<T>('DELETE', path)
  /** The generated CRUD routes wrap a row as `{ data }` or return it bare. */
  const row = <T>(value: { data?: T } | T): T => ((value as { data?: T })?.data ?? value) as T

  return {
    // Account
    async signIn(email: string, password: string) {
      const res = await post<{ token: string, user: { id: number, email: string, name: string } }>('/login', { email, password })
      options.session.save(res.token)
      return res.user
    },
    async signUp(name: string, email: string, password: string) {
      await post('/register', { name, email, password, password_confirmation: password })
      return this.signIn(email, password)
    },
    async signOut() {
      try { await post('/logout') } finally { options.session.save(null) }
    },
    me: () => get<{ id: number, email: string, name: string }>('/me'),

    // Lists
    sidebar: (on = today()) => get<SidebarData>(`/api/sidebar?today=${on}`),
    list: (name: string, on = today()) => get<TodoList>(`/api/lists/${name}?today=${on}`),

    // To-dos
    createTodo: async (todo: Partial<Todo>) => row<Todo>(await post('/api/todos', todo)),
    updateTodo: async (id: number, changes: Partial<Todo>) => row<Todo>(await put(`/api/todos/${id}`, changes)),
    deleteTodo: (id: number) => del(`/api/todos/${id}`),
    completeTodo: (id: number, on = today()) => post<{ todo: Todo, next: Todo | null }>(`/api/todos/${id}/complete?today=${on}`),
    reopenTodo: (id: number) => post<{ todo: Todo }>(`/api/todos/${id}/reopen`),
    createChecklistItem: async (todoId: number, title: string) => row<ChecklistItem>(await post('/api/checklist-items', { todo_id: todoId, title })),
    updateChecklistItem: async (id: number, changes: Partial<ChecklistItem>) => row<ChecklistItem>(await put(`/api/checklist-items/${id}`, changes)),
    deleteChecklistItem: (id: number) => del(`/api/checklist-items/${id}`),

    // Areas and projects
    areas: async () => row<Area[]>(await get('/api/areas')),
    createArea: async (title: string) => row<Area>(await post('/api/areas', { title })),
    updateArea: async (id: number, changes: Partial<Area>) => row<Area>(await put(`/api/areas/${id}`, changes)),
    deleteArea: (id: number) => del(`/api/areas/${id}`),
    createProject: async (project: Partial<Project>) => row<Project>(await post('/api/projects', project)),
    updateProject: async (id: number, changes: Partial<Project>) => row<Project>(await put(`/api/projects/${id}`, changes)),
    deleteProject: (id: number) => del(`/api/projects/${id}`),

    // Notes
    notes: async () => row<Note[]>(await get('/api/notes')),
    note: async (id: number) => row<Note>(await get(`/api/notes/${id}`)),
    saveNote: async (note: { id?: number, body: string, pinned?: boolean, note_folder_id?: number | null }) =>
      (note.id ? await put<{ note: Note }>(`/api/notes/${note.id}`, note) : await post<{ note: Note }>('/api/notes', note)).note,
    deleteNote: (id: number) => del(`/api/notes/${id}`),
    /** Recently Deleted: the server keeps deleted notes for 30 days. */
    notesTrash: () => get<{ notes: Note[], days: number }>('/api/notes/trash'),
    restoreNote: async (id: number) => (await post<{ note: Note }>(`/api/notes/${id}/restore`)).note,
    purgeNote: (id: number) => del(`/api/notes/${id}/purge`),
    noteFolders: async () => row<NoteFolder[]>(await get('/api/note-folders')),
    createNoteFolder: async (title: string) => row<NoteFolder>(await post('/api/note-folders', { title })),
    deleteNoteFolder: (id: number) => del(`/api/note-folders/${id}`),

    // Prompt libraries
    libraries: () => get<LibraryList>('/api/prompt-libraries'),
    createLibrary: async (library: { title: string, description?: string, icon?: string, color?: string }) => row<{ id: number }>(await post('/api/prompt-libraries', library)),
    updateLibrary: (id: number, changes: Record<string, unknown>) => put(`/api/prompt-libraries/${id}`, changes),
    deleteLibrary: (id: number) => del(`/api/prompt-libraries/${id}`),
    prompts: (libraryId?: number, search = '') => get<{ role?: string, prompts: Prompt[] }>(`${libraryId ? `/api/prompt-libraries/${libraryId}/prompts` : '/api/prompts'}${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    savePrompt: async (prompt: Partial<Prompt> & { library_id?: number }) =>
      (prompt.id ? await put<{ prompt: Prompt }>(`/api/prompts/${prompt.id}`, prompt) : await post<{ prompt: Prompt }>('/api/prompts', prompt)).prompt,
    deletePrompt: (id: number) => del(`/api/prompts/${id}`),
    usePrompt: (id: number) => post<{ uses: number }>(`/api/prompts/${id}/use`),
    promptVersions: (id: number) => get<{ versions: PromptVersion[] }>(`/api/prompts/${id}/versions`),

    // Sharing
    shares: (libraryId: number) => get<{ link: { token: string } | null, people: Share[] }>(`/api/prompt-libraries/${libraryId}/shares`),
    share: (libraryId: number, email: string, role: 'viewer' | 'editor') => post<{ share: Share, joined?: boolean }>(`/api/prompt-libraries/${libraryId}/shares`, { email, role }),
    unshare: (shareId: number) => del(`/api/shares/${shareId}`),
    setLink: (libraryId: number, on: boolean) => post<{ link: { token: string } | null }>(`/api/prompt-libraries/${libraryId}/link`, on ? {} : { revoke: '1' }),
    sharedLibrary: (token: string) => get<SharedLibrary>(`/api/shared/${token}`),
  }
}

export type KeptApi = ReturnType<typeof createApi>
