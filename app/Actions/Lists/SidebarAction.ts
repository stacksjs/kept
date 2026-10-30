import { dayOrToday } from '../../Support/dates'
import { listCounts } from '../../Support/lists'
import { signedIn } from '../../Support/session'

/** Everything the sidebar draws: list counts, areas, projects, note folders and prompt libraries. */
export default new Action({
  name: 'Sidebar',
  description: 'The sidebar: smart list counts, areas, projects, note folders and prompt libraries',
  method: 'GET',
  async handle(request) {
    const who = await signedIn(request)
    if ('error' in who) return who.error
    const userId = who.user.id
    const today = dayOrToday(request.get('today'))

    const [todos, areas, projects, folders, notes, owned] = await Promise.all([
      Todo.where('userId', userId).whereNull('completedAt').whereNull('canceledAt').get(),
      Area.where('userId', userId).orderBy('sortOrder').get(),
      Project.where('userId', userId).whereNull('completedAt').whereNull('canceledAt').orderBy('sortOrder').get(),
      NoteFolder.where('userId', userId).orderBy('sortOrder').get(),
      Note.where('userId', userId).get(),
      PromptLibrary.where('userId', userId).orderBy('sortOrder').get(),
    ])
    const open = todos.map(todo => todo.toJSON())
    const perProject = new Map<number, number>()
    for (const todo of open) if (todo.project_id) perProject.set(todo.project_id, (perProject.get(todo.project_id) ?? 0) + 1)
    const perFolder = new Map<number, number>()
    for (const note of notes.map(n => n.toJSON())) if (note.note_folder_id) perFolder.set(note.note_folder_id, (perFolder.get(note.note_folder_id) ?? 0) + 1)

    return response.json({
      lists: listCounts(open, today),
      areas: areas.map(a => a.toJSON()),
      projects: projects.map(p => ({ ...p.toJSON(), open: perProject.get(Number(p.id)) ?? 0 })),
      note_folders: folders.map(f => ({ ...f.toJSON(), notes: perFolder.get(Number(f.id)) ?? 0 })),
      notes: notes.length,
      libraries: owned.map(l => l.toJSON()),
    })
  },
})
