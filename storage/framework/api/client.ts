/* eslint-disable */
/**
 * Stacks API client, generated from the OpenAPI document.
 *
 * Do not edit. Run `buddy generate:openapi` to rebuild it from the routes.
 *
 * No imports and no dependencies: copy this file anywhere that has `fetch`.
 */

/** Every call answers with one of these. Nothing here throws for a 4xx. */
export type ApiResult<T> =
  | { ok: true, status: number, data: T, headers: Headers }
  | { ok: false, status: number, error: unknown, headers: Headers }

export interface ClientConfig {
  /** Where the API lives, e.g. `https://example.com`. No trailing slash needed. */
  baseUrl: string
  /** Sent as `Authorization: Bearer …` when present. */
  token?: string
  /** Extra headers on every request. */
  headers?: Record<string, string>
  /** Swap in a different fetch - a test double, or one that retries. */
  fetch?: typeof fetch
}

export interface RequestOptions {
  /** Abort in flight. */
  signal?: AbortSignal
  /** Headers for this call only, merged over the client's. */
  headers?: Record<string, string>
}

function buildUrl(config: ClientConfig, route: string, input: Record<string, unknown>, query: string[]): string {
  // Path parameters are substituted, never appended: a `{id}` left in the URL
  // is a 404 whose message is about the literal string "{id}".
  const filled = route.replace(/\{(\w+)\}/g, (_, key: string) => encodeURIComponent(String(input[key] ?? '')))
  const url = new URL(filled.replace(/^\/+/, '/'), config.baseUrl.endsWith('/') ? config.baseUrl : `${config.baseUrl}/`)

  for (const key of query) {
    const value = input[key]
    // Absent means absent. Sending `?path=` asks for the file called empty
    // string, which is a different question from not filtering.
    if (value === undefined || value === null) continue
    url.searchParams.set(key, String(value))
  }

  return url.toString()
}

async function request<T>(
  config: ClientConfig,
  method: string,
  route: string,
  input: Record<string, unknown>,
  query: string[],
  hasBody: boolean,
  options?: RequestOptions,
): Promise<ApiResult<T>> {
  const call = config.fetch ?? fetch
  const url = buildUrl(config, route, input, query)

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(config.headers ?? {}),
    ...(options?.headers ?? {}),
  }
  if (config.token) headers.Authorization = `Bearer ${config.token}`

  const body = hasBody && input.body !== undefined ? JSON.stringify(input.body) : undefined
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await call(url, { method, headers, body, signal: options?.signal })

  const text = await response.text()
  let parsed: unknown = text
  if (text.length) {
    // A non-JSON body is kept verbatim rather than replaced with a parse error.
    // An endpoint that answered with HTML is worth seeing.
    try { parsed = JSON.parse(text) } catch { parsed = text }
  }
  else {
    parsed = null
  }

  return response.ok
    ? { ok: true, status: response.status, data: parsed as T, headers: response.headers }
    : { ok: false, status: response.status, error: parsed, headers: response.headers }
}

export function createClient(config: ClientConfig) {
  return {
    /** The configuration in use, so a caller can rebuild a variant of it. */
    config,

  /**
   * GET /.well-known/oauth-authorization-server
   */
  getWellKnownOauthAuthorizationServer(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/.well-known/oauth-authorization-server", {}, [], false, options)
  },

  /**
   * GET /_stacks/mail/preview
   */
  getStacksMailPreview(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/_stacks/mail/preview", {}, [], false, options)
  },

  /**
   * GET /_stacks/mail/preview/{name}
   */
  getStacksMailPreviewName(input: { "name": string }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/_stacks/mail/preview/{name}", input ?? {}, [], false, options)
  },

  /**
   * GET /_stacks/mail/preview/{name}/raw
   */
  getStacksMailPreviewNameRaw(input: { "name": string }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/_stacks/mail/preview/{name}/raw", input ?? {}, [], false, options)
  },

  /**
   * GET /api/areas
   */
  getAreas(options?: RequestOptions): Promise<ApiResult<{ "data": Array<{ "id": number; "uuid": string; "title": string; "icon"?: string; "sort_order"?: number; "user_id"?: number; "created_at"?: string; "updated_at"?: string }> }>> {
    return request(config, "GET", "/api/areas", {}, [], false, options)
  },

  /**
   * POST /api/areas
   */
  postAreas(options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "icon"?: string; "sort_order"?: number; "user_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "POST", "/api/areas", {}, [], false, options)
  },

  /**
   * POST /api/areas/bulk-delete
   */
  postAreasBulkDelete(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/api/areas/bulk-delete", {}, [], false, options)
  },

  /**
   * GET /api/areas/{id}
   */
  getAreasId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "icon"?: string; "sort_order"?: number; "user_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "GET", "/api/areas/{id}", input ?? {}, [], false, options)
  },

  /**
   * PUT /api/areas/{id}
   */
  putAreasId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "icon"?: string; "sort_order"?: number; "user_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "PUT", "/api/areas/{id}", input ?? {}, [], false, options)
  },

  /**
   * DELETE /api/areas/{id}
   */
  deleteAreasId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "icon"?: string; "sort_order"?: number; "user_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "DELETE", "/api/areas/{id}", input ?? {}, [], false, options)
  },

  /**
   * PATCH /api/areas/{id}
   */
  patchAreasId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "icon"?: string; "sort_order"?: number; "user_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "PATCH", "/api/areas/{id}", input ?? {}, [], false, options)
  },

  /**
   * GET /api/checklist-items
   */
  getChecklistItems(options?: RequestOptions): Promise<ApiResult<{ "data": Array<{ "id": number; "uuid": string; "title": string; "done"?: boolean; "sort_order"?: number; "user_id"?: number; "todo_id"?: number; "created_at"?: string; "updated_at"?: string }> }>> {
    return request(config, "GET", "/api/checklist-items", {}, [], false, options)
  },

  /**
   * POST /api/checklist-items
   */
  postChecklistItems(options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "done"?: boolean; "sort_order"?: number; "user_id"?: number; "todo_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "POST", "/api/checklist-items", {}, [], false, options)
  },

  /**
   * POST /api/checklist-items/bulk-delete
   */
  postChecklistItemsBulkDelete(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/api/checklist-items/bulk-delete", {}, [], false, options)
  },

  /**
   * GET /api/checklist-items/{id}
   */
  getChecklistItemsId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "done"?: boolean; "sort_order"?: number; "user_id"?: number; "todo_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "GET", "/api/checklist-items/{id}", input ?? {}, [], false, options)
  },

  /**
   * PUT /api/checklist-items/{id}
   */
  putChecklistItemsId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "done"?: boolean; "sort_order"?: number; "user_id"?: number; "todo_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "PUT", "/api/checklist-items/{id}", input ?? {}, [], false, options)
  },

  /**
   * DELETE /api/checklist-items/{id}
   */
  deleteChecklistItemsId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "done"?: boolean; "sort_order"?: number; "user_id"?: number; "todo_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "DELETE", "/api/checklist-items/{id}", input ?? {}, [], false, options)
  },

  /**
   * PATCH /api/checklist-items/{id}
   */
  patchChecklistItemsId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "done"?: boolean; "sort_order"?: number; "user_id"?: number; "todo_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "PATCH", "/api/checklist-items/{id}", input ?? {}, [], false, options)
  },

  /**
   * POST /api/complete
   */
  postComplete(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/api/complete", {}, [], false, options)
  },

  /**
   * GET /api/headings
   */
  getHeadings(options?: RequestOptions): Promise<ApiResult<{ "data": Array<{ "id": number; "uuid": string; "title": string; "sort_order"?: number; "archived_at"?: unknown; "user_id"?: number; "project_id"?: number; "created_at"?: string; "updated_at"?: string }> }>> {
    return request(config, "GET", "/api/headings", {}, [], false, options)
  },

  /**
   * POST /api/headings
   */
  postHeadings(options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "sort_order"?: number; "archived_at"?: unknown; "user_id"?: number; "project_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "POST", "/api/headings", {}, [], false, options)
  },

  /**
   * POST /api/headings/bulk-delete
   */
  postHeadingsBulkDelete(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/api/headings/bulk-delete", {}, [], false, options)
  },

  /**
   * GET /api/headings/{id}
   */
  getHeadingsId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "sort_order"?: number; "archived_at"?: unknown; "user_id"?: number; "project_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "GET", "/api/headings/{id}", input ?? {}, [], false, options)
  },

  /**
   * PUT /api/headings/{id}
   */
  putHeadingsId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "sort_order"?: number; "archived_at"?: unknown; "user_id"?: number; "project_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "PUT", "/api/headings/{id}", input ?? {}, [], false, options)
  },

  /**
   * DELETE /api/headings/{id}
   */
  deleteHeadingsId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "sort_order"?: number; "archived_at"?: unknown; "user_id"?: number; "project_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "DELETE", "/api/headings/{id}", input ?? {}, [], false, options)
  },

  /**
   * PATCH /api/headings/{id}
   */
  patchHeadingsId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "sort_order"?: number; "archived_at"?: unknown; "user_id"?: number; "project_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "PATCH", "/api/headings/{id}", input ?? {}, [], false, options)
  },

  /**
   * GET /api/hello
   */
  getHello(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/api/hello", {}, [], false, options)
  },

  /**
   * GET /api/lists/{list}
   */
  getListsList(input: { "list": string }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/api/lists/{list}", input ?? {}, [], false, options)
  },

  /**
   * GET /api/note-folders
   */
  getNoteFolders(options?: RequestOptions): Promise<ApiResult<{ "data": Array<{ "id": number; "uuid": string; "title": string; "sort_order"?: number; "user_id"?: number; "created_at"?: string; "updated_at"?: string }> }>> {
    return request(config, "GET", "/api/note-folders", {}, [], false, options)
  },

  /**
   * POST /api/note-folders
   */
  postNoteFolders(options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "sort_order"?: number; "user_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "POST", "/api/note-folders", {}, [], false, options)
  },

  /**
   * POST /api/note-folders/bulk-delete
   */
  postNoteFoldersBulkDelete(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/api/note-folders/bulk-delete", {}, [], false, options)
  },

  /**
   * GET /api/note-folders/{id}
   */
  getNoteFoldersId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "sort_order"?: number; "user_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "GET", "/api/note-folders/{id}", input ?? {}, [], false, options)
  },

  /**
   * PUT /api/note-folders/{id}
   */
  putNoteFoldersId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "sort_order"?: number; "user_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "PUT", "/api/note-folders/{id}", input ?? {}, [], false, options)
  },

  /**
   * DELETE /api/note-folders/{id}
   */
  deleteNoteFoldersId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "sort_order"?: number; "user_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "DELETE", "/api/note-folders/{id}", input ?? {}, [], false, options)
  },

  /**
   * PATCH /api/note-folders/{id}
   */
  patchNoteFoldersId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "sort_order"?: number; "user_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "PATCH", "/api/note-folders/{id}", input ?? {}, [], false, options)
  },

  /**
   * GET /api/notes
   */
  getNotes(options?: RequestOptions): Promise<ApiResult<{ "data": Array<{ "id": number; "uuid": string; "title"?: string; "snippet"?: string; "body"?: string; "pinned"?: boolean; "user_id"?: number; "note_folder_id"?: number; "created_at"?: string; "updated_at"?: string; "deleted_at"?: string }> }>> {
    return request(config, "GET", "/api/notes", {}, [], false, options)
  },

  /**
   * POST /api/notes
   */
  postNotes(options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title"?: string; "snippet"?: string; "body"?: string; "pinned"?: boolean; "user_id"?: number; "note_folder_id"?: number; "created_at"?: string; "updated_at"?: string; "deleted_at"?: string } }>> {
    return request(config, "POST", "/api/notes", {}, [], false, options)
  },

  /**
   * POST /api/notes/bulk-delete
   */
  postNotesBulkDelete(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/api/notes/bulk-delete", {}, [], false, options)
  },

  /**
   * GET /api/notes/trash
   */
  getNotesTrash(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/api/notes/trash", {}, [], false, options)
  },

  /**
   * GET /api/notes/{id}
   */
  getNotesId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title"?: string; "snippet"?: string; "body"?: string; "pinned"?: boolean; "user_id"?: number; "note_folder_id"?: number; "created_at"?: string; "updated_at"?: string; "deleted_at"?: string } }>> {
    return request(config, "GET", "/api/notes/{id}", input ?? {}, [], false, options)
  },

  /**
   * PUT /api/notes/{id}
   */
  putNotesId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title"?: string; "snippet"?: string; "body"?: string; "pinned"?: boolean; "user_id"?: number; "note_folder_id"?: number; "created_at"?: string; "updated_at"?: string; "deleted_at"?: string } }>> {
    return request(config, "PUT", "/api/notes/{id}", input ?? {}, [], false, options)
  },

  /**
   * DELETE /api/notes/{id}
   */
  deleteNotesId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title"?: string; "snippet"?: string; "body"?: string; "pinned"?: boolean; "user_id"?: number; "note_folder_id"?: number; "created_at"?: string; "updated_at"?: string; "deleted_at"?: string } }>> {
    return request(config, "DELETE", "/api/notes/{id}", input ?? {}, [], false, options)
  },

  /**
   * DELETE /api/notes/{id}/purge
   */
  deleteNotesIdPurge(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "DELETE", "/api/notes/{id}/purge", input ?? {}, [], false, options)
  },

  /**
   * POST /api/notes/{id}/restore
   */
  postNotesIdRestore(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/api/notes/{id}/restore", input ?? {}, [], false, options)
  },

  /**
   * GET /api/projects
   */
  getProjects(options?: RequestOptions): Promise<ApiResult<{ "data": Array<{ "id": number; "uuid": string; "title": string; "notes"?: string; "when"?: "anytime" | "someday"; "start_date"?: string; "deadline"?: string; "tags"?: string; "sort_order"?: number; "completed_at"?: unknown; "canceled_at"?: unknown; "user_id"?: number; "area_id"?: number; "created_at"?: string; "updated_at"?: string }> }>> {
    return request(config, "GET", "/api/projects", {}, [], false, options)
  },

  /**
   * POST /api/projects
   */
  postProjects(options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "notes"?: string; "when"?: "anytime" | "someday"; "start_date"?: string; "deadline"?: string; "tags"?: string; "sort_order"?: number; "completed_at"?: unknown; "canceled_at"?: unknown; "user_id"?: number; "area_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "POST", "/api/projects", {}, [], false, options)
  },

  /**
   * POST /api/projects/bulk-delete
   */
  postProjectsBulkDelete(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/api/projects/bulk-delete", {}, [], false, options)
  },

  /**
   * GET /api/projects/{id}
   */
  getProjectsId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "notes"?: string; "when"?: "anytime" | "someday"; "start_date"?: string; "deadline"?: string; "tags"?: string; "sort_order"?: number; "completed_at"?: unknown; "canceled_at"?: unknown; "user_id"?: number; "area_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "GET", "/api/projects/{id}", input ?? {}, [], false, options)
  },

  /**
   * PUT /api/projects/{id}
   */
  putProjectsId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "notes"?: string; "when"?: "anytime" | "someday"; "start_date"?: string; "deadline"?: string; "tags"?: string; "sort_order"?: number; "completed_at"?: unknown; "canceled_at"?: unknown; "user_id"?: number; "area_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "PUT", "/api/projects/{id}", input ?? {}, [], false, options)
  },

  /**
   * DELETE /api/projects/{id}
   */
  deleteProjectsId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "notes"?: string; "when"?: "anytime" | "someday"; "start_date"?: string; "deadline"?: string; "tags"?: string; "sort_order"?: number; "completed_at"?: unknown; "canceled_at"?: unknown; "user_id"?: number; "area_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "DELETE", "/api/projects/{id}", input ?? {}, [], false, options)
  },

  /**
   * PATCH /api/projects/{id}
   */
  patchProjectsId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "notes"?: string; "when"?: "anytime" | "someday"; "start_date"?: string; "deadline"?: string; "tags"?: string; "sort_order"?: number; "completed_at"?: unknown; "canceled_at"?: unknown; "user_id"?: number; "area_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "PATCH", "/api/projects/{id}", input ?? {}, [], false, options)
  },

  /**
   * GET /api/prompt-libraries
   */
  getPromptLibraries(options?: RequestOptions): Promise<ApiResult<{ "data": Array<{ "id": number; "uuid": string; "title": string; "description"?: string; "icon"?: string; "color"?: string; "share_token"?: string; "sort_order"?: number; "user_id"?: number; "created_at"?: string; "updated_at"?: string }> }>> {
    return request(config, "GET", "/api/prompt-libraries", {}, [], false, options)
  },

  /**
   * POST /api/prompt-libraries
   */
  postPromptLibraries(options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "description"?: string; "icon"?: string; "color"?: string; "share_token"?: string; "sort_order"?: number; "user_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "POST", "/api/prompt-libraries", {}, [], false, options)
  },

  /**
   * POST /api/prompt-libraries/bulk-delete
   */
  postPromptLibrariesBulkDelete(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/api/prompt-libraries/bulk-delete", {}, [], false, options)
  },

  /**
   * PUT /api/prompt-libraries/{id}
   */
  putPromptLibrariesId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "description"?: string; "icon"?: string; "color"?: string; "share_token"?: string; "sort_order"?: number; "user_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "PUT", "/api/prompt-libraries/{id}", input ?? {}, [], false, options)
  },

  /**
   * DELETE /api/prompt-libraries/{id}
   */
  deletePromptLibrariesId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "description"?: string; "icon"?: string; "color"?: string; "share_token"?: string; "sort_order"?: number; "user_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "DELETE", "/api/prompt-libraries/{id}", input ?? {}, [], false, options)
  },

  /**
   * PATCH /api/prompt-libraries/{id}
   */
  patchPromptLibrariesId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "description"?: string; "icon"?: string; "color"?: string; "share_token"?: string; "sort_order"?: number; "user_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "PATCH", "/api/prompt-libraries/{id}", input ?? {}, [], false, options)
  },

  /**
   * POST /api/prompt-libraries/{id}/link
   */
  postPromptLibrariesIdLink(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/api/prompt-libraries/{id}/link", input ?? {}, [], false, options)
  },

  /**
   * GET /api/prompt-libraries/{id}/prompts
   */
  getPromptLibrariesIdPrompts(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/api/prompt-libraries/{id}/prompts", input ?? {}, [], false, options)
  },

  /**
   * GET /api/prompt-libraries/{id}/shares
   */
  getPromptLibrariesIdShares(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/api/prompt-libraries/{id}/shares", input ?? {}, [], false, options)
  },

  /**
   * POST /api/prompt-libraries/{id}/shares
   */
  postPromptLibrariesIdShares(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/api/prompt-libraries/{id}/shares", input ?? {}, [], false, options)
  },

  /**
   * GET /api/prompt-versions
   */
  getPromptVersions(options?: RequestOptions): Promise<ApiResult<{ "data": Array<{ "id": number; "uuid": string; "version"?: number; "title"?: string; "body"?: string; "user_id"?: number; "prompt_id"?: number; "created_at"?: string; "updated_at"?: string }> }>> {
    return request(config, "GET", "/api/prompt-versions", {}, [], false, options)
  },

  /**
   * GET /api/prompt-versions/{id}
   */
  getPromptVersionsId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "version"?: number; "title"?: string; "body"?: string; "user_id"?: number; "prompt_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "GET", "/api/prompt-versions/{id}", input ?? {}, [], false, options)
  },

  /**
   * GET /api/prompts
   */
  getPrompts(options?: RequestOptions): Promise<ApiResult<{ "data": Array<{ "id": number; "uuid": string; "title": string; "description"?: string; "body"?: string; "model"?: string; "tags"?: string; "favorite"?: boolean; "uses"?: number; "version"?: number; "user_id"?: number; "prompt_library_id"?: number; "created_at"?: string; "updated_at"?: string; "deleted_at"?: string }> }>> {
    return request(config, "GET", "/api/prompts", {}, [], false, options)
  },

  /**
   * POST /api/prompts
   */
  postPrompts(options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "description"?: string; "body"?: string; "model"?: string; "tags"?: string; "favorite"?: boolean; "uses"?: number; "version"?: number; "user_id"?: number; "prompt_library_id"?: number; "created_at"?: string; "updated_at"?: string; "deleted_at"?: string } }>> {
    return request(config, "POST", "/api/prompts", {}, [], false, options)
  },

  /**
   * POST /api/prompts/bulk-delete
   */
  postPromptsBulkDelete(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/api/prompts/bulk-delete", {}, [], false, options)
  },

  /**
   * PUT /api/prompts/{id}
   */
  putPromptsId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "description"?: string; "body"?: string; "model"?: string; "tags"?: string; "favorite"?: boolean; "uses"?: number; "version"?: number; "user_id"?: number; "prompt_library_id"?: number; "created_at"?: string; "updated_at"?: string; "deleted_at"?: string } }>> {
    return request(config, "PUT", "/api/prompts/{id}", input ?? {}, [], false, options)
  },

  /**
   * DELETE /api/prompts/{id}
   */
  deletePromptsId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "description"?: string; "body"?: string; "model"?: string; "tags"?: string; "favorite"?: boolean; "uses"?: number; "version"?: number; "user_id"?: number; "prompt_library_id"?: number; "created_at"?: string; "updated_at"?: string; "deleted_at"?: string } }>> {
    return request(config, "DELETE", "/api/prompts/{id}", input ?? {}, [], false, options)
  },

  /**
   * POST /api/prompts/{id}/use
   */
  postPromptsIdUse(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/api/prompts/{id}/use", input ?? {}, [], false, options)
  },

  /**
   * GET /api/prompts/{id}/versions
   */
  getPromptsIdVersions(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/api/prompts/{id}/versions", input ?? {}, [], false, options)
  },

  /**
   * GET /api/shared/{token}
   */
  getSharedToken(input: { "token": string }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/api/shared/{token}", input ?? {}, [], false, options)
  },

  /**
   * POST /api/shares/bulk-delete
   */
  postSharesBulkDelete(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/api/shares/bulk-delete", {}, [], false, options)
  },

  /**
   * DELETE /api/shares/{id}
   */
  deleteSharesId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "resource_type": "library" | "note" | "project"; "resource_id": number; "shared_with_user_id"?: number; "email"?: string; "role"?: "viewer" | "editor"; "accepted_at"?: unknown; "user_id"?: number; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "DELETE", "/api/shares/{id}", input ?? {}, [], false, options)
  },

  /**
   * GET /api/sidebar
   */
  getSidebar(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/api/sidebar", {}, [], false, options)
  },

  /**
   * GET /api/team-invitations
   */
  getTeamInvitations(options?: RequestOptions): Promise<ApiResult<{ "data": Array<{ "id": number; "uuid": string; "team_id": number; "email": string; "role": "admin" | "member" | "viewer"; "invited_by_user_id"?: number; "accepted_by_user_id"?: number; "status": "pending" | "accepted" | "revoked" | "expired"; "delivery_status": "pending" | "sent" | "failed"; "expires_at": unknown; "delivered_at"?: unknown; "accepted_at"?: unknown; "created_at"?: string; "updated_at"?: string }> }>> {
    return request(config, "GET", "/api/team-invitations", {}, [], false, options)
  },

  /**
   * POST /api/team-invitations/bulk-delete
   */
  postTeamInvitationsBulkDelete(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/api/team-invitations/bulk-delete", {}, [], false, options)
  },

  /**
   * GET /api/team-invitations/{id}
   */
  getTeamInvitationsId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "team_id": number; "email": string; "role": "admin" | "member" | "viewer"; "invited_by_user_id"?: number; "accepted_by_user_id"?: number; "status": "pending" | "accepted" | "revoked" | "expired"; "delivery_status": "pending" | "sent" | "failed"; "expires_at": unknown; "delivered_at"?: unknown; "accepted_at"?: unknown; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "GET", "/api/team-invitations/{id}", input ?? {}, [], false, options)
  },

  /**
   * DELETE /api/team-invitations/{id}
   */
  deleteTeamInvitationsId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "team_id": number; "email": string; "role": "admin" | "member" | "viewer"; "invited_by_user_id"?: number; "accepted_by_user_id"?: number; "status": "pending" | "accepted" | "revoked" | "expired"; "delivery_status": "pending" | "sent" | "failed"; "expires_at": unknown; "delivered_at"?: unknown; "accepted_at"?: unknown; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "DELETE", "/api/team-invitations/{id}", input ?? {}, [], false, options)
  },

  /**
   * GET /api/team-members
   */
  getTeamMembers(options?: RequestOptions): Promise<ApiResult<{ "data": Array<{ "id": number; "uuid": string; "team_id": number; "user_id": number; "role": "owner" | "admin" | "member" | "viewer"; "status": "active" | "suspended"; "created_at"?: string; "updated_at"?: string }> }>> {
    return request(config, "GET", "/api/team-members", {}, [], false, options)
  },

  /**
   * POST /api/team-members
   */
  postTeamMembers(options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "team_id": number; "user_id": number; "role": "owner" | "admin" | "member" | "viewer"; "status": "active" | "suspended"; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "POST", "/api/team-members", {}, [], false, options)
  },

  /**
   * POST /api/team-members/bulk-delete
   */
  postTeamMembersBulkDelete(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/api/team-members/bulk-delete", {}, [], false, options)
  },

  /**
   * GET /api/team-members/{id}
   */
  getTeamMembersId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "team_id": number; "user_id": number; "role": "owner" | "admin" | "member" | "viewer"; "status": "active" | "suspended"; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "GET", "/api/team-members/{id}", input ?? {}, [], false, options)
  },

  /**
   * PUT /api/team-members/{id}
   */
  putTeamMembersId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "team_id": number; "user_id": number; "role": "owner" | "admin" | "member" | "viewer"; "status": "active" | "suspended"; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "PUT", "/api/team-members/{id}", input ?? {}, [], false, options)
  },

  /**
   * DELETE /api/team-members/{id}
   */
  deleteTeamMembersId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "team_id": number; "user_id": number; "role": "owner" | "admin" | "member" | "viewer"; "status": "active" | "suspended"; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "DELETE", "/api/team-members/{id}", input ?? {}, [], false, options)
  },

  /**
   * PATCH /api/team-members/{id}
   */
  patchTeamMembersId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "team_id": number; "user_id": number; "role": "owner" | "admin" | "member" | "viewer"; "status": "active" | "suspended"; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "PATCH", "/api/team-members/{id}", input ?? {}, [], false, options)
  },

  /**
   * GET /api/teams
   */
  getTeams(options?: RequestOptions): Promise<ApiResult<{ "data": Array<{ "id": number; "uuid": string; "name"?: string; "description"?: string; "member_count"?: number; "status"?: string; "created_at"?: string; "updated_at"?: string }> }>> {
    return request(config, "GET", "/api/teams", {}, [], false, options)
  },

  /**
   * POST /api/teams
   */
  postTeams(options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "name"?: string; "description"?: string; "member_count"?: number; "status"?: string; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "POST", "/api/teams", {}, [], false, options)
  },

  /**
   * POST /api/teams/bulk-delete
   */
  postTeamsBulkDelete(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/api/teams/bulk-delete", {}, [], false, options)
  },

  /**
   * GET /api/teams/{id}
   */
  getTeamsId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "name"?: string; "description"?: string; "member_count"?: number; "status"?: string; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "GET", "/api/teams/{id}", input ?? {}, [], false, options)
  },

  /**
   * PUT /api/teams/{id}
   */
  putTeamsId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "name"?: string; "description"?: string; "member_count"?: number; "status"?: string; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "PUT", "/api/teams/{id}", input ?? {}, [], false, options)
  },

  /**
   * DELETE /api/teams/{id}
   */
  deleteTeamsId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "name"?: string; "description"?: string; "member_count"?: number; "status"?: string; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "DELETE", "/api/teams/{id}", input ?? {}, [], false, options)
  },

  /**
   * PATCH /api/teams/{id}
   */
  patchTeamsId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "name"?: string; "description"?: string; "member_count"?: number; "status"?: string; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "PATCH", "/api/teams/{id}", input ?? {}, [], false, options)
  },

  /**
   * GET /api/todos
   */
  getTodos(options?: RequestOptions): Promise<ApiResult<{ "data": Array<{ "id": number; "uuid": string; "title": string; "notes"?: string; "when"?: "inbox" | "today" | "evening" | "anytime" | "someday"; "start_date"?: string; "deadline"?: string; "tags"?: string; "repeat"?: "none" | "daily" | "weekly" | "monthly" | "yearly"; "sort_order"?: number; "completed_at"?: unknown; "canceled_at"?: unknown; "user_id"?: number; "area_id"?: number; "project_id"?: number; "heading_id"?: number; "created_at"?: string; "updated_at"?: string; "deleted_at"?: string }> }>> {
    return request(config, "GET", "/api/todos", {}, [], false, options)
  },

  /**
   * POST /api/todos
   */
  postTodos(options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "notes"?: string; "when"?: "inbox" | "today" | "evening" | "anytime" | "someday"; "start_date"?: string; "deadline"?: string; "tags"?: string; "repeat"?: "none" | "daily" | "weekly" | "monthly" | "yearly"; "sort_order"?: number; "completed_at"?: unknown; "canceled_at"?: unknown; "user_id"?: number; "area_id"?: number; "project_id"?: number; "heading_id"?: number; "created_at"?: string; "updated_at"?: string; "deleted_at"?: string } }>> {
    return request(config, "POST", "/api/todos", {}, [], false, options)
  },

  /**
   * POST /api/todos/bulk-delete
   */
  postTodosBulkDelete(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/api/todos/bulk-delete", {}, [], false, options)
  },

  /**
   * GET /api/todos/{id}
   */
  getTodosId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "notes"?: string; "when"?: "inbox" | "today" | "evening" | "anytime" | "someday"; "start_date"?: string; "deadline"?: string; "tags"?: string; "repeat"?: "none" | "daily" | "weekly" | "monthly" | "yearly"; "sort_order"?: number; "completed_at"?: unknown; "canceled_at"?: unknown; "user_id"?: number; "area_id"?: number; "project_id"?: number; "heading_id"?: number; "created_at"?: string; "updated_at"?: string; "deleted_at"?: string } }>> {
    return request(config, "GET", "/api/todos/{id}", input ?? {}, [], false, options)
  },

  /**
   * PUT /api/todos/{id}
   */
  putTodosId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "notes"?: string; "when"?: "inbox" | "today" | "evening" | "anytime" | "someday"; "start_date"?: string; "deadline"?: string; "tags"?: string; "repeat"?: "none" | "daily" | "weekly" | "monthly" | "yearly"; "sort_order"?: number; "completed_at"?: unknown; "canceled_at"?: unknown; "user_id"?: number; "area_id"?: number; "project_id"?: number; "heading_id"?: number; "created_at"?: string; "updated_at"?: string; "deleted_at"?: string } }>> {
    return request(config, "PUT", "/api/todos/{id}", input ?? {}, [], false, options)
  },

  /**
   * DELETE /api/todos/{id}
   */
  deleteTodosId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "notes"?: string; "when"?: "inbox" | "today" | "evening" | "anytime" | "someday"; "start_date"?: string; "deadline"?: string; "tags"?: string; "repeat"?: "none" | "daily" | "weekly" | "monthly" | "yearly"; "sort_order"?: number; "completed_at"?: unknown; "canceled_at"?: unknown; "user_id"?: number; "area_id"?: number; "project_id"?: number; "heading_id"?: number; "created_at"?: string; "updated_at"?: string; "deleted_at"?: string } }>> {
    return request(config, "DELETE", "/api/todos/{id}", input ?? {}, [], false, options)
  },

  /**
   * PATCH /api/todos/{id}
   */
  patchTodosId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "title": string; "notes"?: string; "when"?: "inbox" | "today" | "evening" | "anytime" | "someday"; "start_date"?: string; "deadline"?: string; "tags"?: string; "repeat"?: "none" | "daily" | "weekly" | "monthly" | "yearly"; "sort_order"?: number; "completed_at"?: unknown; "canceled_at"?: unknown; "user_id"?: number; "area_id"?: number; "project_id"?: number; "heading_id"?: number; "created_at"?: string; "updated_at"?: string; "deleted_at"?: string } }>> {
    return request(config, "PATCH", "/api/todos/{id}", input ?? {}, [], false, options)
  },

  /**
   * POST /api/todos/{id}/complete
   */
  postTodosIdComplete(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/api/todos/{id}/complete", input ?? {}, [], false, options)
  },

  /**
   * POST /api/todos/{id}/reopen
   */
  postTodosIdReopen(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/api/todos/{id}/reopen", input ?? {}, [], false, options)
  },

  /**
   * GET /api/users
   */
  getUsers(options?: RequestOptions): Promise<ApiResult<{ "data": Array<{ "id": number; "uuid": string; "name"?: string; "email"?: string; "avatar"?: string; "created_at"?: string; "updated_at"?: string }> }>> {
    return request(config, "GET", "/api/users", {}, [], false, options)
  },

  /**
   * POST /api/users
   */
  postUsers(options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "name"?: string; "email"?: string; "avatar"?: string; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "POST", "/api/users", {}, [], false, options)
  },

  /**
   * GET /api/users/{id}
   */
  getUsersId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<{ "data": { "id": number; "uuid": string; "name"?: string; "email"?: string; "avatar"?: string; "created_at"?: string; "updated_at"?: string } }>> {
    return request(config, "GET", "/api/users/{id}", input ?? {}, [], false, options)
  },

  /**
   * GET /auth/abilities
   */
  getAuthAbilities(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/auth/abilities", {}, [], false, options)
  },

  /**
   * POST /auth/magic-link
   */
  postAuthMagicLink(input: { body: { "email": string } }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/auth/magic-link", input ?? {}, [], true, options)
  },

  /**
   * POST /auth/magic-link/consume
   */
  postAuthMagicLinkConsume(input: { body: { "token": string } }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/auth/magic-link/consume", input ?? {}, [], true, options)
  },

  /**
   * GET /auth/oauth/clients
   */
  getAuthOauthClients(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/auth/oauth/clients", {}, [], false, options)
  },

  /**
   * POST /auth/oauth/clients
   */
  postAuthOauthClients(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/auth/oauth/clients", {}, [], false, options)
  },

  /**
   * PATCH /auth/oauth/clients/{id}
   */
  patchAuthOauthClientsId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "PATCH", "/auth/oauth/clients/{id}", input ?? {}, [], false, options)
  },

  /**
   * POST /auth/oauth/clients/{id}/disable
   */
  postAuthOauthClientsIdDisable(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/auth/oauth/clients/{id}/disable", input ?? {}, [], false, options)
  },

  /**
   * POST /auth/oauth/clients/{id}/rotate-secret
   */
  postAuthOauthClientsIdRotateSecret(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/auth/oauth/clients/{id}/rotate-secret", input ?? {}, [], false, options)
  },

  /**
   * GET /auth/oauth/connections
   */
  getAuthOauthConnections(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/auth/oauth/connections", {}, [], false, options)
  },

  /**
   * POST /auth/oauth/connections/{id}/disconnect
   */
  postAuthOauthConnectionsIdDisconnect(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/auth/oauth/connections/{id}/disconnect", input ?? {}, [], false, options)
  },

  /**
   * GET /auth/passkeys
   */
  getAuthPasskeys(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/auth/passkeys", {}, [], false, options)
  },

  /**
   * POST /auth/passkeys/authentication
   */
  postAuthPasskeysAuthentication(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/auth/passkeys/authentication", {}, [], false, options)
  },

  /**
   * POST /auth/passkeys/authentication/options
   */
  postAuthPasskeysAuthenticationOptions(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/auth/passkeys/authentication/options", {}, [], false, options)
  },

  /**
   * POST /auth/passkeys/registration
   */
  postAuthPasskeysRegistration(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/auth/passkeys/registration", {}, [], false, options)
  },

  /**
   * POST /auth/passkeys/registration/options
   */
  postAuthPasskeysRegistrationOptions(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/auth/passkeys/registration/options", {}, [], false, options)
  },

  /**
   * DELETE /auth/passkeys/{id}
   */
  deleteAuthPasskeysId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "DELETE", "/auth/passkeys/{id}", input ?? {}, [], false, options)
  },

  /**
   * POST /auth/refresh
   */
  postAuthRefresh(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/auth/refresh", {}, [], false, options)
  },

  /**
   * POST /auth/token
   */
  postAuthToken(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/auth/token", {}, [], false, options)
  },

  /**
   * GET /auth/tokens
   */
  getAuthTokens(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/auth/tokens", {}, [], false, options)
  },

  /**
   * DELETE /auth/tokens/{id}
   */
  deleteAuthTokensId(input: { "id": string }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "DELETE", "/auth/tokens/{id}", input ?? {}, [], false, options)
  },

  /**
   * POST /disable-two-factor
   */
  postDisableTwoFactor(input: { body: { "password": string } }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/disable-two-factor", input ?? {}, [], true, options)
  },

  /**
   * POST /enable-two-factor
   */
  postEnableTwoFactor(input: { body: { "code": string } }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/enable-two-factor", input ?? {}, [], true, options)
  },

  /**
   * GET /generate-authentication-options
   */
  getGenerateAuthenticationOptions(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/generate-authentication-options", {}, [], false, options)
  },

  /**
   * GET /generate-registration-options
   */
  getGenerateRegistrationOptions(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/generate-registration-options", {}, [], false, options)
  },

  /**
   * POST /generate-two-factor-secret
   */
  postGenerateTwoFactorSecret(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/generate-two-factor-secret", {}, [], false, options)
  },

  /**
   * GET /locale/{locale}
   */
  getLocaleLocale(input: { "locale": string }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/locale/{locale}", input ?? {}, [], false, options)
  },

  /**
   * POST /login
   */
  postLogin(input: { body: { "email": string; "password": string } }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/login", input ?? {}, [], true, options)
  },

  /**
   * POST /logout
   */
  postLogout(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/logout", {}, [], false, options)
  },

  /**
   * POST /logout-all
   */
  postLogoutAll(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/logout-all", {}, [], false, options)
  },

  /**
   * GET /me
   */
  getMe(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/me", {}, [], false, options)
  },

  /**
   * GET /me/data-export
   */
  getMeDataExport(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/me/data-export", {}, [], false, options)
  },

  /**
   * GET /oauth/authorize
   */
  getOauthAuthorize(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/oauth/authorize", {}, [], false, options)
  },

  /**
   * POST /oauth/authorize
   */
  postOauthAuthorize(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/oauth/authorize", {}, [], false, options)
  },

  /**
   * POST /oauth/introspect
   */
  postOauthIntrospect(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/oauth/introspect", {}, [], false, options)
  },

  /**
   * POST /oauth/revoke
   */
  postOauthRevoke(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/oauth/revoke", {}, [], false, options)
  },

  /**
   * POST /oauth/token
   */
  postOauthToken(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/oauth/token", {}, [], false, options)
  },

  /**
   * POST /password/forgot
   */
  postPasswordForgot(input: { body: { "email": string } }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/password/forgot", input ?? {}, [], true, options)
  },

  /**
   * POST /password/reset
   */
  postPasswordReset(input: { body: { "email": string; "token": string; "password": string } }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/password/reset", input ?? {}, [], true, options)
  },

  /**
   * POST /password/verify-token
   */
  postPasswordVerifyToken(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/password/verify-token", {}, [], false, options)
  },

  /**
   * GET /referrals
   */
  getReferrals(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/referrals", {}, [], false, options)
  },

  /**
   * POST /referrals/code
   */
  postReferralsCode(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/referrals/code", {}, [], false, options)
  },

  /**
   * POST /register
   */
  postRegister(input: { body: { "email": string; "password": string; "name": string } }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/register", input ?? {}, [], true, options)
  },

  /**
   * GET /robots.txt
   */
  getRobotsTxt(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "GET", "/robots.txt", {}, [], false, options)
  },

  /**
   * POST /verify-authentication
   */
  postVerifyAuthentication(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/verify-authentication", {}, [], false, options)
  },

  /**
   * POST /verify-registration
   */
  postVerifyRegistration(options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/verify-registration", {}, [], false, options)
  },

  /**
   * POST /verify-two-factor-login
   */
  postVerifyTwoFactorLogin(input: { body: { "challenge_token": string; "code": string } }, options?: RequestOptions): Promise<ApiResult<Record<string, unknown>>> {
    return request(config, "POST", "/verify-two-factor-login", input ?? {}, [], true, options)
  },
  }
}

export type Client = ReturnType<typeof createClient>
