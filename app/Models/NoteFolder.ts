import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation/runtime'

/** A folder of notes (Notes.app "Folder"). */
export default defineModel({
  name: 'NoteFolder',
  table: 'note_folders',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useSeeder: { count: 0 },
    useApi: { uri: 'note-folders', routes: ['index', 'store', 'show', 'update', 'destroy'], middleware: ['auth'] },
  },

  belongsTo: ['User'],
  hasMany: ['Note'],

  attributes: {
    title: {
      order: 1,
      fillable: true,
      required: true,
      validation: { rule: schema.string().required().min(1).max(200) },
      factory: faker => faker.word.noun(),
    },
    sortOrder: {
      order: 2,
      fillable: true,
      default: 0,
      validation: { rule: schema.number() },
      factory: () => 0,
    },
  },

  dashboard: { enabled: false },
} as const)
