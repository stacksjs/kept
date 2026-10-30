import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation/runtime'

/** A standing area of life or work (Things "Area"): projects and to-dos hang off it. */
export default defineModel({
  name: 'Area',
  table: 'areas',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useSeeder: { count: 0 },
    useApi: { uri: 'areas', routes: ['index', 'store', 'show', 'update', 'destroy'], middleware: ['auth'] },
  },

  belongsTo: ['User'],
  hasMany: ['Project', 'Todo'],

  attributes: {
    title: {
      order: 1,
      fillable: true,
      required: true,
      validation: { rule: schema.string().required().min(1).max(200) },
      factory: faker => faker.word.noun(),
    },
    icon: {
      order: 2,
      fillable: true,
      default: 'folder',
      validation: { rule: schema.string().max(40) },
      factory: () => 'folder',
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
