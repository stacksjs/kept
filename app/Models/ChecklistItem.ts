import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation/runtime'

/** One step inside a to-do's checklist. */
export default defineModel({
  name: 'ChecklistItem',
  table: 'checklist_items',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useSeeder: { count: 0 },
    useApi: { uri: 'checklist-items', routes: ['index', 'store', 'show', 'update', 'destroy'], middleware: ['auth'] },
  },

  belongsTo: ['User', 'Todo'],

  attributes: {
    title: {
      order: 1,
      fillable: true,
      required: true,
      validation: { rule: schema.string().required().min(1).max(500) },
      factory: faker => faker.lorem.words(3),
    },
    done: {
      order: 2,
      fillable: true,
      default: false,
      validation: { rule: schema.boolean() },
      factory: () => false,
    },
    sortOrder: {
      order: 3,
      fillable: true,
      default: 0,
      validation: { rule: schema.number() },
      factory: () => 0,
    },
  },

  dashboard: { enabled: false },
} as const)
