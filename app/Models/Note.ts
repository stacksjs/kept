import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation/runtime'

/**
 * A note. `body` is Markdown: `- [ ]` lines are checklists, `#tag` words are
 * tags. The title is the first line, like Notes.app, and is kept denormalised
 * so list views never load whole bodies.
 */
export default defineModel({
  name: 'Note',
  table: 'notes',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useSoftDeletes: true,
    useSearch: {
      displayable: ['id', 'title', 'snippet', 'pinned', 'folderId', 'updatedAt'],
      searchable: ['title', 'body'],
      sortable: ['updatedAt', 'createdAt', 'title'],
      filterable: ['folderId', 'pinned'],
    },
    useSeeder: { count: 0 },
    useApi: { uri: 'notes', routes: ['index', 'show', 'destroy'], middleware: ['auth'] },
  },

  belongsTo: ['User', 'NoteFolder'],

  attributes: {
    title: {
      order: 1,
      fillable: true,
      default: '',
      validation: { rule: schema.string().max(300) },
      factory: faker => faker.lorem.words(4),
    },
    snippet: {
      order: 2,
      fillable: true,
      default: '',
      validation: { rule: schema.string().max(300) },
      factory: () => '',
    },
    body: {
      order: 3,
      fillable: true,
      default: '',
      validation: { rule: schema.string().max(200000) },
      factory: faker => faker.lorem.paragraphs(2),
    },
    pinned: {
      order: 4,
      fillable: true,
      default: false,
      validation: { rule: schema.boolean() },
      factory: () => false,
    },
  },

  dashboard: { enabled: false },
} as const)
