/**
 * End-to-end check of Library's API against a running server (`./buddy dev --api`):
 * registers a throwaway user, walks the to-do, note and prompt-sharing flows
 * the apps depend on, and fails loudly on the first surprise.
 *
 *   bun scripts/smoke-api.ts [http://127.0.0.1:3408]
 */
const base = process.argv[2] ?? 'http://127.0.0.1:3408'
let failures = 0

function check(name: string, ok: unknown, detail?: unknown): void {
  if (ok) { console.log(`ok   ${name}`); return }
  failures++
  console.log(`FAIL ${name}`, detail === undefined ? '' : JSON.stringify(detail).slice(0, 300))
}

class Client {
  token = ''
  jar = ''
  csrf = ''
  async call(method: string, path: string, body?: unknown): Promise<{ status: number, json: any }> {
    const headers: Record<string, string> = { 'content-type': 'application/json', 'accept': 'application/json' }
    if (this.token) headers.authorization = `Bearer ${this.token}`
    else { if (!this.csrf) await this.seed(); headers.cookie = `X-CSRF-Token=${this.csrf}`; headers['x-csrf-token'] = this.csrf }
    const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    const text = await res.text()
    let json: any = null
    try { json = JSON.parse(text) } catch { json = text }
    return { status: res.status, json }
  }
  async seed(): Promise<void> {
    const res = await fetch(`${base}/me`)
    this.csrf = /X-CSRF-Token=([0-9a-f]+)/.exec(res.headers.get('set-cookie') ?? '')?.[1] ?? ''
  }
  /** Registration is rate limited to 3 a minute, so wait out the window rather than fail on it. */
  async register(body: Record<string, string>): Promise<void> {
    for (let attempt = 0; attempt < 6; attempt++) {
      const res = await this.call('POST', '/register', body)
      if (res.status !== 429) return
      console.log('     (registration rate limit reached, waiting 20s)')
      await new Promise(resolve => setTimeout(resolve, 20_000))
    }
  }
  async signUp(name: string): Promise<{ id: number, email: string }> {
    const email = `smoke-${name}-${Date.now()}@example.com`
    const password = 'correct-horse-battery-1'
    await this.register({ name, email, password, password_confirmation: password })
    const login = await this.call('POST', '/login', { email, password })
    this.token = login.json.token
    return { id: login.json.user.id, email }
  }
}

const today = new Date().toISOString().slice(0, 10)
const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10)

const owner = new Client()
const me = await owner.signUp('Owner')
check('signs up and in', owner.token)

// To-dos and smart lists
const area = await owner.call('POST', '/api/areas', { title: 'Home' })
check('creates an area', area.status < 300, area.json)
const project = await owner.call('POST', '/api/projects', { title: 'Garden' })
check('creates a project', project.status < 300, project.json)
const created: Record<string, any> = {}
for (const [key, body] of Object.entries({
  inbox: { title: 'Buy milk' },
  today: { title: 'Call mum', when: 'today' },
  later: { title: 'Plan trip', when: 'anytime', start_date: tomorrow },
  repeating: { title: 'Water plants', when: 'today', repeat: 'weekly' },
  someday: { title: 'Learn piano', when: 'someday' },
})) {
  const res = await owner.call('POST', '/api/todos', body)
  created[key] = res.json?.data ?? res.json
  check(`creates to-do "${body.title}"`, res.status < 300, res.json)
}
const list = async (name: string) => (await owner.call('GET', `/api/lists/${name}?today=${today}`)).json?.todos?.map((t: any) => t.title) ?? []
check('Inbox holds only the undated to-do', JSON.stringify(await list('inbox')) === JSON.stringify(['Buy milk']), await list('inbox'))
check('Today holds the two chosen for today', (await list('today')).length === 2, await list('today'))
check('Upcoming holds the scheduled one', (await list('upcoming')).includes('Plan trip'))
check('Someday holds the parked one', (await list('someday')).includes('Learn piano'))

const side = await owner.call('GET', `/api/sidebar?today=${today}`)
check('sidebar counts match', side.json?.lists?.inbox === 1 && side.json?.lists?.today === 2 && side.json?.lists?.upcoming === 1, side.json?.lists)

const repeatId = created.repeating?.id
const done = await owner.call('POST', `/api/todos/${repeatId}/complete?today=${today}`)
check('completing a repeating to-do schedules the next', done.status === 200 && done.json?.next?.start_date, done.json)
check('the finished one is in the Logbook', (await list('logbook')).includes('Water plants'))
const reopened = await owner.call('POST', `/api/todos/${repeatId}/reopen`)
check('reopening works', reopened.status === 200, reopened.json)

// Data isolation: another person must not see my to-dos.
const stranger = new Client()
await stranger.signUp('Stranger')
check('another account sees none of my to-dos', ((await stranger.call('GET', `/api/lists/inbox?today=${today}`)).json?.todos ?? []).length === 0)
check('another account cannot complete my to-do', (await stranger.call('POST', `/api/todos/${created.today?.id}/complete`)).status === 404)

// Notes
const note = await owner.call('POST', '/api/notes', { body: '# Trip plan\n- [ ] Book flights\nmore' })
check('creates a note titled from its first line', note.json?.note?.title === 'Trip plan' && note.json?.note?.snippet === 'Book flights', note.json)
const edited = await owner.call('PUT', `/api/notes/${note.json?.note?.id}`, { body: 'Renamed\nline two' })
check('editing a note retitles it', edited.json?.note?.title === 'Renamed', edited.json)

// Recently Deleted: soft delete, list, restore, purge
const gone = await owner.call('DELETE', `/api/notes/${note.json?.note?.id}`)
check('deleting a note moves it to Recently Deleted', gone.status < 300, gone.json)
const trash = await owner.call('GET', '/api/notes/trash')
check('the trash lists it', trash.json?.notes?.some((n: any) => n.id === note.json?.note?.id), trash.json)
const back = await owner.call('POST', `/api/notes/${note.json?.note?.id}/restore`)
check('restoring brings it back', back.status === 200 && back.json?.note?.id === note.json?.note?.id, back.json)
check('a stranger cannot restore my note', (await stranger.call('POST', `/api/notes/${note.json?.note?.id}/restore`)).status === 404)
await owner.call('DELETE', `/api/notes/${note.json?.note?.id}`)
const purged = await owner.call('DELETE', `/api/notes/${note.json?.note?.id}/purge`)
check('purge removes it for good', purged.status === 200 && (await owner.call('GET', '/api/notes/trash')).json?.notes?.length === 0, purged.json)

// Prompt library + sharing
const lib = await owner.call('POST', '/api/prompt-libraries', { title: 'Writing' })
const libId = (lib.json?.data ?? lib.json)?.id
check('creates a prompt library', lib.status < 300 && libId, lib.json)
const prompt = await owner.call('POST', '/api/prompts', { library_id: libId, title: 'Polite email', body: 'Write a {{tone}} email to {{name}}', tags: ['email'] })
check('creates a prompt', prompt.status === 201, prompt.json)
const promptId = prompt.json?.prompt?.id
const second = await owner.call('PUT', `/api/prompts/${promptId}`, { title: 'Polite email', body: 'Write a {{tone}} email to {{name}} about {{topic}}' })
check('editing the body bumps the version', second.json?.prompt?.version === 2, second.json)
const versions = await owner.call('GET', `/api/prompts/${promptId}/versions`)
check('keeps both versions', versions.json?.versions?.length === 2, versions.json)

check('a stranger cannot see the library', (await stranger.call('GET', `/api/prompt-libraries/${libId}/prompts`)).status === 404)
const shareByEmail = await stranger.call('POST', `/api/prompt-libraries/${libId}/shares`, { email: 'x@example.com' })
check('a stranger cannot manage sharing', shareByEmail.status === 404, shareByEmail.json)

const friend = new Client()
const friendUser = await friend.signUp('Friend')
const shared = await owner.call('POST', `/api/prompt-libraries/${libId}/shares`, { email: friendUser.email, role: 'viewer' })
check('shares the library with a friend by email', shared.status === 201 && shared.json?.joined, shared.json)
const friendLibs = await friend.call('GET', '/api/prompt-libraries')
check('it appears under Shared with me', friendLibs.json?.shared?.some((l: any) => l.id === libId && l.role === 'viewer'), friendLibs.json)
const friendPrompts = await friend.call('GET', `/api/prompt-libraries/${libId}/prompts`)
check('the friend can read its prompts with their variables', friendPrompts.json?.prompts?.[0]?.variables?.join() === 'tone,name,topic', friendPrompts.json)
check('a viewer cannot edit', (await friend.call('PUT', `/api/prompts/${promptId}`, { title: 'Hacked', body: 'x' })).status === 403)
await owner.call('POST', `/api/prompt-libraries/${libId}/shares`, { email: friendUser.email, role: 'editor' })
const edit = await friend.call('PUT', `/api/prompts/${promptId}`, { title: 'Polite email', body: 'Write a {{tone}} email to {{name}} about {{topic}} in {{language}}' })
check('upgraded to editor, the friend can edit', edit.status === 200 && edit.json?.prompt?.version === 3, edit.json)
const authors = await owner.call('GET', `/api/prompts/${promptId}/versions`)
check('history names who wrote each version', authors.json?.versions?.[0]?.author === 'Friend', authors.json)

// A person without an account yet is claimed when they sign up.
const waiting = `smoke-late-${Date.now()}@example.com`
await owner.call('POST', `/api/prompt-libraries/${libId}/shares`, { email: waiting })
const late = new Client()
await late.register({ name: 'Late', email: waiting, password: 'correct-horse-battery-1', password_confirmation: 'correct-horse-battery-1' })
late.token = (await late.call('POST', '/login', { email: waiting, password: 'correct-horse-battery-1' })).json.token
check('an invited email is claimed on first sign-in', (await late.call('GET', '/api/prompt-libraries')).json?.shared?.length === 1)

// Read-only link
const link = await owner.call('POST', `/api/prompt-libraries/${libId}/link`)
const token = link.json?.link?.token
check('creates a public link', token?.length >= 16, link.json)
const open = await fetch(`${base}/api/shared/${token}`).then(r => r.json())
check('the link shows the library without any account', open.prompts?.length === 1 && open.library?.title === 'Writing' && !JSON.stringify(open).includes(me.email), open)
await owner.call('POST', `/api/prompt-libraries/${libId}/link`, { revoke: '1' })
check('revoking the link closes it', (await fetch(`${base}/api/shared/${token}`)).status === 404)

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed')
process.exit(failures ? 1 : 0)
