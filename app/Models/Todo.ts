import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation/runtime'

/**
 * A to-do. `when` places it in a Things list (Inbox, Today, This Evening,
 * Anytime, Someday); `startDate` schedules it into Upcoming. `deadline` and
 * `startDate` are `YYYY-MM-DD` so they never shift with a time zone.
 */
export default defineModel({
  name: 'Todo',
  table: 'todos',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useSoftDeletes: true,
    useSeeder: { count: 0 },
    useApi: { uri: 'todos', routes: ['index', 'store', 'show', 'update', 'destroy'], middleware: ['auth'] },
  },

  belongsTo: ['User', 'Area', 'Project', 'Heading'],
  hasMany: ['ChecklistItem'],

  attributes: {
    title: {
      order: 1,
      fillable: true,
      required: true,
      validation: { rule: schema.string().required().min(1).max(500) },
      factory: faker => faker.lorem.sentence({ min: 2, max: 6 }),
    },
    notes: {
      order: 2,
      fillable: true,
      validation: { rule: schema.string().max(50000) },
      factory: () => '',
    },
    when: {
      order: 3,
      fillable: true,
      default: 'inbox',
      validation: { rule: schema.enum(['inbox', 'today', 'evening', 'anytime', 'someday']) },
      factory: () => 'inbox',
    },
    startDate: {
      order: 4,
      fillable: true,
      validation: { rule: schema.string().max(10) },
      factory: () => null,
    },
    deadline: {
      order: 5,
      fillable: true,
      validation: { rule: schema.string().max(10) },
      factory: () => null,
    },
    tags: {
      order: 6,
      fillable: true,
      default: '[]',
      validation: { rule: schema.string().max(2000) },
      factory: () => '[]',
    },
    repeat: {
      order: 7,
      fillable: true,
      // none | daily | weekly | monthly | yearly, applied when the to-do is completed.
      default: 'none',
      validation: { rule: schema.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']) },
      factory: () => 'none',
    },
    sortOrder: {
      order: 8,
      fillable: true,
      default: 0,
      validation: { rule: schema.number() },
      factory: () => 0,
    },
    completedAt: {
      order: 9,
      fillable: true,
      validation: { rule: schema.timestamp() },
      factory: () => null,
    },
    canceledAt: {
      order: 10,
      fillable: true,
      validation: { rule: schema.timestamp() },
      factory: () => null,
    },
  },

  dashboard: { enabled: false },
} as const)
