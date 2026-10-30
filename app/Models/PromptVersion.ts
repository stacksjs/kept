import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation/runtime'

/** A saved revision of a prompt, so edits by teammates can be compared and restored. */
export default defineModel({
  name: 'PromptVersion',
  table: 'prompt_versions',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useSeeder: { count: 0 },
    useApi: { uri: 'prompt-versions', routes: ['index', 'show'], middleware: ['auth'] },
  },

  belongsTo: ['User', 'Prompt'],

  attributes: {
    version: {
      fillable: true,
      order: 1,
      validation: { rule: schema.number().required() },
      factory: () => 1,
    },
    title: {
      fillable: true,
      order: 2,
      validation: { rule: schema.string().required().max(300) },
      factory: faker => faker.lorem.words(3),
    },
    body: {
      fillable: true,
      order: 3,
      validation: { rule: schema.string().max(100000) },
      factory: faker => faker.lorem.paragraph(),
    },
  },

  dashboard: { enabled: false },
} as const)
