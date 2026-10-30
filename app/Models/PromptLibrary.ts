import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation/runtime'

/**
 * A collection of prompts. Shared with people through `Share` rows, or with
 * anyone holding the read-only link when `shareToken` is set.
 */
export default defineModel({
  name: 'PromptLibrary',
  table: 'prompt_libraries',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useSeeder: { count: 0 },
    // Reads (and the shared-with-me view) go through app/Actions/Prompts so a
    // library shared with the caller shows up; writes stay owner-scoped.
    useApi: { uri: 'prompt-libraries', routes: ['store', 'update', 'destroy'], middleware: ['auth'] },
  },

  belongsTo: ['User'],
  hasMany: ['Prompt'],

  attributes: {
    title: {
      order: 1,
      fillable: true,
      required: true,
      validation: { rule: schema.string().required().min(1).max(200) },
      factory: faker => faker.word.noun(),
    },
    description: {
      order: 2,
      fillable: true,
      default: '',
      validation: { rule: schema.string().max(2000) },
      factory: () => '',
    },
    icon: {
      order: 3,
      fillable: true,
      default: 'sparkles',
      validation: { rule: schema.string().max(40) },
      factory: () => 'sparkles',
    },
    color: {
      order: 4,
      fillable: true,
      default: 'blue',
      validation: { rule: schema.string().max(20) },
      factory: () => 'blue',
    },
    shareToken: {
      order: 5,
      fillable: false,
      hidden: false,
      validation: { rule: schema.string().max(64) },
      factory: () => null,
    },
    sortOrder: {
      order: 6,
      fillable: true,
      default: 0,
      validation: { rule: schema.number() },
      factory: () => 0,
    },
  },

  dashboard: { enabled: false },
} as const)
