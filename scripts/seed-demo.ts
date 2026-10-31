/**
 * Fills a running Library server with a believable account, for screenshots,
 * reviewers and local development:
 *
 *   bun scripts/seed-demo.ts [http://127.0.0.1:3408]
 *
 * Signs in as demo@library.test (creating it on first run) and adds areas,
 * projects, to-dos, notes and a shared prompt library. Safe to run twice: it
 * does nothing when the account already has to-dos.
 */
const base = process.argv[2] ?? 'http://127.0.0.1:3408'
const email = process.env.DEMO_EMAIL ?? 'demo@library.test'
const password = process.env.DEMO_PASSWORD ?? 'library-demo-account-1'

let token = ''
let csrf = ''
async function call(method: string, path: string, body?: unknown): Promise<any> {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'accept': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  else {
    if (!csrf) csrf = /X-CSRF-Token=([0-9a-f]+)/.exec((await fetch(`${base}/me`)).headers.get('set-cookie') ?? '')?.[1] ?? ''
    headers.cookie = `X-CSRF-Token=${csrf}`
    headers['x-csrf-token'] = csrf
  }
  const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  const text = await res.text()
  try { return { status: res.status, json: JSON.parse(text) } } catch { return { status: res.status, json: text } }
}
const row = (r: any) => r.json?.data ?? r.json

let login = await call('POST', '/login', { email, password })
if (login.status >= 400) {
  await call('POST', '/register', { name: 'Demo Person', email, password, password_confirmation: password })
  login = await call('POST', '/login', { email, password })
}
token = login.json.token
if (!token) throw new Error(`Could not sign in as ${email}: ${JSON.stringify(login.json).slice(0, 200)}`)

const today = new Date().toISOString().slice(0, 10)
const plus = (days: number) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10)

const existing = await call('GET', `/api/lists/inbox?today=${today}`)
const counts = (await call('GET', `/api/sidebar?today=${today}`)).json?.lists
if (counts && counts.inbox + counts.today + counts.anytime + counts.upcoming > 0) {
  console.log(`${email} already has data; nothing to seed.`)
  process.exit(0)
}
void existing

const home = row(await call('POST', '/api/areas', { title: 'Home' }))
const work = row(await call('POST', '/api/areas', { title: 'Work' }))
const trip = row(await call('POST', '/api/projects', { title: 'Plan the Lisbon trip', area_id: home.id, notes: 'Flights, a place to stay, and a list of places to eat.' }))
const launch = row(await call('POST', '/api/projects', { title: 'Launch the newsletter', area_id: work.id }))

const todo = (body: Record<string, unknown>) => call('POST', '/api/todos', { tags: '[]', ...body })
await todo({ title: 'Buy oat milk and coffee' })
await todo({ title: 'Reply to Sam about Saturday' })
await todo({ title: 'Look into a standing desk' })
await todo({ title: 'Book flights to Lisbon', when: 'today', project_id: trip.id, deadline: plus(3), tags: '["travel"]' })
await todo({ title: 'Call the dentist', when: 'today', notes: 'Ask about the Thursday slot.' })
await todo({ title: 'Water the plants', when: 'today', repeat: 'weekly' })
await todo({ title: 'Cook something nice', when: 'evening' })
await todo({ title: 'Find an apartment near Alfama', project_id: trip.id, when: 'anytime' })
await todo({ title: 'Draft the first issue', project_id: launch.id, when: 'anytime' })
await todo({ title: 'Pick a sending domain', project_id: launch.id, when: 'anytime', tags: '["email"]' })
await todo({ title: 'Renew passport', when: 'anytime', start_date: plus(2), deadline: plus(30) })
await todo({ title: 'Dinner with Mia and Jonas', when: 'anytime', start_date: plus(5) })
await todo({ title: 'Quarterly review', when: 'anytime', start_date: plus(12), area_id: work.id })
await todo({ title: 'Learn to bake sourdough', when: 'someday' })
await todo({ title: 'Take a pottery class', when: 'someday' })

const folder = row(await call('POST', '/api/note-folders', { title: 'Ideas' }))
await call('POST', '/api/notes', { body: '# Lisbon food list\n\n- [ ] Pasteis de nata at Manteigaria\n- [ ] Time Out Market\n- [x] Book a table at Taberna da Rua das Flores\n\nOrder the grilled sardines. #travel' })
await call('POST', '/api/notes', { body: '# Newsletter name ideas\n\nKept short and warm.\n\n1. The Weekly Shelf\n2. Open Stacks\n3. Small Good Things', note_folder_id: folder.id, pinned: true })
await call('POST', '/api/notes', { body: 'Meeting notes\nTalked through the launch plan. Ship the first issue on a Thursday.' })

const lib = row(await call('POST', '/api/prompt-libraries', { title: 'Writing', description: 'Prompts the team reaches for every week', icon: 'sparkles', color: 'blue' }))
await call('POST', '/api/prompts', { library_id: lib.id, title: 'Polite email', description: 'A short email in any tone', body: 'Write a {{tone}} email to {{name}} about {{topic}}. Keep it under 120 words.', tags: ['email'], favorite: true })
await call('POST', '/api/prompts', { library_id: lib.id, title: 'Summarise for a busy reader', body: 'Summarise the text below in three bullet points, then one sentence on what to do next.\n\n{{text}}', tags: ['summary'] })
await call('POST', '/api/prompts', { library_id: lib.id, title: 'Rewrite more simply', body: 'Rewrite the following so a 12 year old could follow it, keeping every fact:\n\n{{text}}' })
const code = row(await call('POST', '/api/prompt-libraries', { title: 'Code review', description: 'Review checklists', icon: 'code', color: 'green' }))
await call('POST', '/api/prompts', { library_id: code.id, title: 'Review this diff', body: 'Review the diff below for bugs, unclear names and missing tests. Be specific and kind.\n\n{{diff}}', tags: ['review'] })

console.log(`Seeded ${email}. Sign in with the password in scripts/seed-demo.ts (or DEMO_PASSWORD).`)
