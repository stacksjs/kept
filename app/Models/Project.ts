import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation/runtime'

/** A goal made of to-dos and headings, optionally filed under an Area. */
export default defineModel({
  name: 'Project',
  table: 'projects',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useSeeder: { count: 0 },
    useApi: { uri: 'projects', routes: ['index', 'store', 'show', 'update', 'destroy'], middleware: ['auth'] },
  },

  belongsTo: ['User', 'Area'],
  hasMany: ['Heading', 'Todo'],

  attributes: {
    title: {
      order: 1,
      fillable: true,
      required: true,
      validation: { rule: schema.string().required().min(1).max(300) },
      factory: faker => faker.lorem.words(3),
    },
    notes: {
      order: 2,
      fillable: true,
      validation: { rule: schema.string().max(20000) },
      factory: () => '',
    },
    when: {
      order: 3,
      fillable: true,
      default: 'anytime',
      validation: { rule: schema.enum(['anytime', 'someday']) },
      factory: () => 'anytime',
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
    sortOrder: {
      order: 7,
      fillable: true,
      default: 0,
      validation: { rule: schema.number() },
      factory: () => 0,
    },
    completedAt: {
      order: 8,
      fillable: true,
      validation: { rule: schema.timestamp() },
      factory: () => null,
    },
    canceledAt: {
      order: 9,
      fillable: true,
      validation: { rule: schema.timestamp() },
      factory: () => null,
    },
  },

  dashboard: { enabled: false },
} as const)
