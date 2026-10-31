/** The rows Library's API returns. Field names are the database's (snake_case). */
export type When = 'inbox' | 'today' | 'evening' | 'anytime' | 'someday'
export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface ChecklistItem { id: number, todo_id: number, title: string, done: boolean, sort_order: number }

export interface Todo {
  id: number
  title: string
  notes: string
  when: When
  start_date: string | null
  deadline: string | null
  tags: string[]
  repeat: Repeat
  sort_order: number
  completed_at: string | null
  canceled_at: string | null
  area_id: number | null
  project_id: number | null
  heading_id: number | null
  checklist: ChecklistItem[]
}

export interface Area { id: number, title: string, icon: string, sort_order: number }
export interface Project { id: number, title: string, notes: string, area_id: number | null, when: 'anytime' | 'someday', deadline: string | null, open?: number }
export interface NoteFolder { id: number, title: string, notes?: number }
export interface Note { id: number, title: string, snippet: string, body: string, pinned: boolean, note_folder_id: number | null, updated_at: string }

export interface SidebarData {
  lists: { inbox: number, today: number, upcoming: number, anytime: number, someday: number, evening: number, overdue: number }
  areas: Area[]
  projects: Project[]
  note_folders: NoteFolder[]
  notes: number
  libraries: Library[]
}

export interface TodoList { list: string, today: string, todos: Todo[] }

export interface Library { id: number, title: string, description: string, icon: string, color: string, prompts?: number, linked?: boolean, role?: 'viewer' | 'editor', owner?: string }
export interface LibraryList { owned: Library[], shared: Library[] }

export interface Prompt {
  id: number
  prompt_library_id: number
  title: string
  description: string
  body: string
  model: string
  tags: string[]
  favorite: boolean
  uses: number
  version: number
  variables: string[]
  updated_at: string
}
export interface PromptVersion { id: number, version: number, title: string, body: string, author: string, created_at: string }

export interface Share { id: number, email: string, name: string, role: 'viewer' | 'editor', accepted: boolean }
export interface SharedLibrary {
  library: { title: string, description: string, icon: string, color: string, owner: string }
  prompts: Array<Pick<Prompt, 'id' | 'title' | 'description' | 'body' | 'model' | 'tags' | 'variables'>>
}
