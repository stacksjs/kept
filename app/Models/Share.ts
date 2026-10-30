import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation/runtime'

/**
 * Gives a person access to something a user owns: a prompt library, a note, or
 * a project. The grantee is a user (`sharedWithUserId`) once they have an
 * account, or an `email` until they accept the invitation.
 */
export default defineModel({
  name: 'Share',
  table: 'shares',
  primaryKey: 'id',
  autoIncrement: true,

  indexes: [
    { name: 'shares_resource_index', columns: ['resource_type', 'resource_id'] },
    { name: 'shares_grantee_index', columns: ['shared_with_user_id'] },
  ],

  traits: {
    useUuid: true,
    useTimestamps: true,
    useSeeder: { count: 0 },
    // Created and read through app/Actions/Shares so the owner check, the
    // invitation email and the accept step live in one place.
    useApi: { uri: 'shares', routes: ['destroy'], middleware: ['auth'] },
  },

  belongsTo: ['User'],

  attributes: {
    resourceType: {
      fillable: true,
      order: 1,
      required: true,
      validation: { rule: schema.enum(['library', 'note', 'project']).required() },
      factory: () => 'library',
    },
    resourceId: {
      fillable: true,
      order: 2,
      required: true,
      validation: { rule: schema.number().required() },
      factory: () => 1,
    },
    sharedWithUserId: {
      fillable: true,
      order: 3,
      validation: { rule: schema.number() },
      factory: () => null,
    },
    email: {
      fillable: true,
      order: 4,
      personal: true,
      validation: { rule: schema.string().email().max(320) },
      factory: faker => faker.internet.email(),
    },
    role: {
      fillable: true,
      order: 5,
      default: 'viewer',
      validation: { rule: schema.enum(['viewer', 'editor']) },
      factory: () => 'viewer',
    },
    acceptedAt: {
      fillable: true,
      order: 7,
      validation: { rule: schema.timestamp() },
      factory: () => null,
    },
  },

  dashboard: { enabled: false },
} as const)
