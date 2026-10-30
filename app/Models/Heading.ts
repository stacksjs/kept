import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation/runtime'

/** A divider inside a project that groups its to-dos. */
export default defineModel({
  name: 'Heading',
  table: 'headings',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useSeeder: { count: 0 },
    useApi: { uri: 'headings', routes: ['index', 'store', 'show', 'update', 'destroy'], middleware: ['auth'] },
  },

  belongsTo: ['User', 'Project'],

  attributes: {
    title: {
      order: 1,
      fillable: true,
      required: true,
      validation: { rule: schema.string().required().min(1).max(300) },
      factory: faker => faker.lorem.words(2),
    },
    sortOrder: {
      order: 2,
      fillable: true,
      default: 0,
      validation: { rule: schema.number() },
      factory: () => 0,
    },
    archivedAt: {
      order: 3,
      fillable: true,
      validation: { rule: schema.timestamp() },
      factory: () => null,
    },
  },

  dashboard: { enabled: false },
} as const)
