import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation/runtime'

/**
 * A reusable prompt. `body` holds `{{variable}}` placeholders that the app
 * fills in before copying or sending the prompt. Every save of a changed body
 * adds a `PromptVersion`.
 */
export default defineModel({
  name: 'Prompt',
  table: 'prompts',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useSoftDeletes: true,
    useSearch: {
      displayable: ['id', 'title', 'description', 'promptLibraryId', 'favorite', 'updatedAt'],
      searchable: ['title', 'description', 'body'],
      sortable: ['updatedAt', 'createdAt', 'title', 'uses'],
      filterable: ['promptLibraryId', 'favorite'],
    },
    useSeeder: { count: 0 },
    useApi: { uri: 'prompts', routes: ['destroy'], middleware: ['auth'] },
  },

  belongsTo: ['User', 'PromptLibrary'],
  hasMany: ['PromptVersion'],

  attributes: {
    title: {
      order: 1,
      fillable: true,
      required: true,
      validation: { rule: schema.string().required().min(1).max(300) },
      factory: faker => faker.lorem.words(4),
    },
    description: {
      order: 2,
      fillable: true,
      default: '',
      validation: { rule: schema.string().max(2000) },
      factory: () => '',
    },
    body: {
      order: 3,
      fillable: true,
      default: '',
      validation: { rule: schema.string().max(100000) },
      factory: faker => faker.lorem.paragraph(),
    },
    model: {
      order: 4,
      fillable: true,
      default: '',
      // A hint such as "claude-sonnet-5-5"; the app never calls a model itself.
      validation: { rule: schema.string().max(100) },
      factory: () => '',
    },
    tags: {
      order: 5,
      fillable: true,
      default: '[]',
      validation: { rule: schema.string().max(2000) },
      factory: () => '[]',
    },
    favorite: {
      order: 6,
      fillable: true,
      default: false,
      validation: { rule: schema.boolean() },
      factory: () => false,
    },
    uses: {
      order: 7,
      fillable: true,
      default: 0,
      validation: { rule: schema.number() },
      factory: () => 0,
    },
    version: {
      order: 8,
      fillable: true,
      default: 1,
      validation: { rule: schema.number() },
      factory: () => 1,
    },
  },

  dashboard: { enabled: false },
} as const)
