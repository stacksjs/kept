import { signedIn } from '../../Support/session'

/** What a person owns, children before parents. Soft-deleted rows go too: deleting means gone. */
const OWNED = [
  'prompt_versions',
  'prompts',
  'prompt_libraries',
  'checklist_items',
  'todos',
  'headings',
  'projects',
  'areas',
  'notes',
  'note_folders',
] as const

/**
 * Framework tables that may hold a row for this person. Which of them exist
 * depends on the database (a migration set can leave some out), and a missing
 * table has nothing to delete.
 */
const FRAMEWORK = [
  'notification_preferences',
  'notifications',
  'team_members',
  'user_roles',
  'user_permissions',
  'email_verifications',
  'magic_link_tokens',
  'passkeys',
  'subscribers',
] as const

async function deleteIfPresent(table: string, id: number): Promise<void> {
  try { await db.deleteFrom(table).where('user_id', '=', id).execute() }
  catch (error) {
    if (!/no such table|doesn'?t exist|does not exist/i.test(String((error as Error)?.message))) throw error
  }
}

/**
 * Delete the signed-in account and everything in it, for good. The person
 * proves it is deliberate by typing their email address.
 */
export default new Action({
  name: 'DeleteAccount',
  description: 'Permanently delete the signed-in account and all of its data',
  method: 'POST',
  async handle(request) {
    const who = await signedIn(request)
    if ('error' in who) return who.error
    const typed = String(request.get('email') ?? '').trim().toLowerCase()
    if (!typed || typed !== who.user.email.toLowerCase())
      return response.json({ error: 'Type your email address to confirm' }, 422)

    const id = who.user.id
    for (const table of OWNED) await db.deleteFrom(table).where('user_id', '=', id).execute()
    for (const table of FRAMEWORK) await deleteIfPresent(table, id)
    // Shares: the ones this person made, and the ones that invited them.
    await db.deleteFrom('shares').where('user_id', '=', id).execute()
    await db.deleteFrom('shares').where('shared_with_user_id', '=', id).execute()
    // A refresh token hangs off an access token, so it goes first.
    const tokens = await db.selectFrom('oauth_access_tokens').where('user_id', '=', id).select('id').execute()
    for (const token of tokens) await db.deleteFrom('oauth_refresh_tokens').where('access_token_id', '=', Number(token.id)).execute()
    await db.deleteFrom('oauth_access_tokens').where('user_id', '=', id).execute()
    await db.deleteFrom('users').where('id', '=', id).execute()
    return response.json({ deleted: true })
  },
})
