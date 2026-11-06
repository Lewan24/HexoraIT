import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"
import ts from "typescript"

const source = await readFile(
  new URL("../src/api/mockApi.ts", import.meta.url),
  "utf8",
)
const standaloneSource = source
  .replace(
    /import \{ ApiError \} from ["']\.\/errors["']/,
    `class ApiError extends Error { constructor(status, message, details) { super(message); this.status = status; this.details = details } }`,
  )
  .replace(
    /import \{ MODULE_ID, RESOURCES \} from ["']\.\.\/lib\/permissions["']/,
    `const MODULE_ID = '00000000-0000-0000-0000-000000000000'; const RESOURCES = ['dashboard','assets','passwords','networks','licenses','contacts','contracts','plans','incidents','knowledge','tasks','projects','groups','warranty','diagram','files','settings']`,
  )
  .replace(
    /import \{ DEMO_ACCOUNTS, DEMO_STORAGE_KEY \} from ["']\.\.\/demo["']/,
    `const DEMO_STORAGE_KEY = 'hexorait_demo_state_v1'; const DEMO_ACCOUNTS = { user: { email: 'demo@hexorait.local', password: 'DemoUser123!' }, admin: { email: 'admin@hexorait.local', password: 'DemoAdmin123!' } }`,
  )
const compiled = ts.transpileModule(standaloneSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ESNext,
  },
}).outputText
const { mockApi } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
)

class MemoryStorage {
  values = new Map()
  getItem(key) {
    return this.values.get(key) ?? null
  }
  setItem(key, value) {
    this.values.set(key, String(value))
  }
  removeItem(key) {
    this.values.delete(key)
  }
  clear() {
    this.values.clear()
  }
}

globalThis.localStorage = new MemoryStorage()

async function signIn(email, password) {
  const result = await mockApi.request(
    "POST",
    "/auth/login",
    JSON.stringify({ email, password }),
  )
  localStorage.setItem("auth_token", result.token)
  return result
}

test("demo transport seeds accounts and persists CRUD changes in localStorage", async () => {
  localStorage.clear()
  const auth = await signIn("admin@hexorait.local", "DemoAdmin123!")
  assert.equal(auth.user.systemRole, "Admin")

  const organizations = await mockApi.request("GET", "/organizations")
  assert.equal(organizations.length, 1)
  const organizationId = organizations[0].id

  const created = await mockApi.request(
    "POST",
    `/assets?organizationId=${organizationId}`,
    JSON.stringify({
      name: "Browser-only asset",
      type: "Server",
      status: "online",
      starred: false,
    }),
  )
  await mockApi.request("PATCH", `/assets/${created.id}/star`)
  const assets = await mockApi.request(
    "GET",
    `/assets?organizationId=${organizationId}`,
  )
  assert.equal(assets.find((item) => item.id === created.id).starred, true)
  assert.ok(localStorage.getItem("hexorait_demo_state_v1"))
})

test("demo user and administrator keep distinct system roles", async () => {
  localStorage.clear()
  const auth = await signIn("demo@hexorait.local", "DemoUser123!")
  assert.equal(auth.user.systemRole, "User")
  await assert.rejects(
    () => mockApi.request("GET", "/admin/users"),
    (error) => error.status === 403,
  )
})

test('temporary organization modules and documentation survive archiving and reactivation', async () => {
  localStorage.clear()
  await signIn('admin@hexorait.local', 'DemoAdmin123!')
  const org = await mockApi.request('POST', '/organizations', JSON.stringify({ name: 'One-off engagement', color: '#2563eb', initials: 'OE', description: '', isTemporary: true }))
  assert.equal(org.isTemporary, true)
  assert.equal(org.isArchived, false)
  const prefs = await mockApi.request('GET', `/organizations/${org.id}/customization`)
  assert.ok(prefs.hiddenModules.includes('diagram'))
  assert.ok(!prefs.hiddenModules.includes('files'))
  const contact = await mockApi.request('POST', `/contacts?organizationId=${org.id}`, JSON.stringify({ name: 'Client contact' }))
  await mockApi.request('POST', `/organizations/${org.id}/archive`)
  const archived = await mockApi.request('GET', `/organizations/${org.id}`)
  assert.equal(archived.isArchived, true)
  assert.ok(archived.archivedAt)
  assert.ok((await mockApi.request('GET', '/organizations')).some(item => item.id === org.id))
  await mockApi.request('POST', `/organizations/${org.id}/unarchive`)
  const restored = await mockApi.request('GET', `/organizations/${org.id}`)
  assert.equal(restored.isArchived, false)
  assert.equal(restored.archivedAt, null)
  assert.deepEqual((await mockApi.request('GET', `/organizations/${org.id}/customization`)).hiddenModules, prefs.hiddenModules)
  assert.ok((await mockApi.request('GET', `/contacts?organizationId=${org.id}`)).some(item => item.id === contact.id))
  await signIn('demo@hexorait.local', 'DemoUser123!')
  await assert.rejects(() => mockApi.request('POST', `/organizations/${org.id}/archive`), error => error.status === 403)
})

test('demo indices persist, order metadata and reject foreign batches and read-only writes', async () => {
  localStorage.clear()
  const auth = await signIn('admin@hexorait.local', 'DemoAdmin123!')
  const org = auth.organizations[0].id
  const path = `/organizations/${org}/record-order/contacts`
  const contacts = await mockApi.request('GET', '/contacts?organizationId=' + org)
  const contact = contacts[0]
  const saved = await mockApi.request('PATCH', path, { changes: [{ id: contact.id, sortIndex: 25 }] })
  assert.equal(saved[0].sortIndex, 25)
  assert.equal((await mockApi.request('GET', path))[0].sortIndex, 25)
  await assert.rejects(mockApi.request('PATCH', path, { changes: [{ id: contact.id, sortIndex: 1 }, { id: 'foreign-id', sortIndex: 2 }] }), error => error.status === 400)
  assert.equal((await mockApi.request('GET', path))[0].sortIndex, 25)
  const state = JSON.parse(localStorage.getItem('hexorait_demo_state_v1'))
  state.memberships.find(x => x.userId === auth.user.id).role = 'ReadOnly'
  localStorage.setItem('hexorait_demo_state_v1', JSON.stringify(state))
  await assert.rejects(mockApi.request('PATCH', path, { changes: [{ id: contact.id, sortIndex: 5 }] }), error => error.status === 403)
})

test('demo network synchronization is idempotent and preserves manual rows and manual edits', async () => {
  localStorage.clear()
  const auth = await signIn('admin@hexorait.local', 'DemoAdmin123!')
  const org = auth.organizations[0].id
  const state = JSON.parse(localStorage.getItem('hexorait_demo_state_v1'))
  state.resources.assets = [{ id: 'asset-a', organizationId: org, name: 'Server', ip: '10.1.2.8' }, { id: 'asset-b', organizationId: org, name: 'IPv6 server', ip: '2001:db8::9' }]
  state.resources.subnets = [{ id: 'broad', organizationId: org, name: 'Broad', cidr: '10.0.0.0/8', ips: [] }, { id: 'lan', organizationId: org, name: 'LAN', cidr: '10.1.2.0/24', ips: [{ id: 'printer', ip: '10.1.2.99', label: 'Printer', notes: 'Preserve notes' }] }, { id: 'v6', organizationId: org, name: 'IPv6', cidr: '2001:db8::/64', ips: [] }]
  localStorage.setItem('hexorait_demo_state_v1', JSON.stringify(state))
  const path = '/subnets/sync-assets?organizationId=' + org
  assert.equal((await mockApi.request('POST', path)).added, 2)
  assert.equal((await mockApi.request('POST', path)).unchanged, 2)
  let subnets = await mockApi.request('GET', '/subnets?organizationId=' + org)
  const lan = subnets.find(x => x.id === 'lan')
  assert.equal(lan.ips.length, 2)
  assert.equal(lan.ips.find(x => x.id === 'printer').notes, 'Preserve notes')
  const automatic = lan.ips.find(x => x.assetId === 'asset-a')
  await mockApi.request('PUT', '/subnets/lan/ips/' + automatic.id, { ...automatic, label: 'Manual' })
  await mockApi.request('POST', path)
  subnets = await mockApi.request('GET', '/subnets?organizationId=' + org)
  assert.equal(subnets.find(x => x.id === 'lan').ips.find(x => x.id === automatic.id).label, 'Manual')
})

test('private note cards store Markdown unchanged, remain scoped to their author and support saved indices', async () => {
  localStorage.clear()
  const auth = await signIn('admin@hexorait.local', 'DemoAdmin123!')
  const org = auth.organizations[0].id, path = `/organizations/${org}/private-notes`
  const content = '# Header\n**Bold**\nSecond line\n<script>text only</script>'
  const note = await mockApi.request('POST', path, { title: 'Personal', content, userId: 'forged-author' })
  assert.equal(note.userId, auth.user.id)
  assert.equal(note.content, content)
  await mockApi.request('PATCH', `/organizations/${org}/record-order/private-notes`, { changes: [{ id: note.id, sortIndex: 40 }] })
  const saved = await mockApi.request('PUT', path + '/' + note.id, { title: 'Renamed', content })
  assert.equal(saved.sortIndex, 40)
  await signIn('demo@hexorait.local', 'DemoUser123!')
  assert.deepEqual(await mockApi.request('GET', path), [])
  await assert.rejects(mockApi.request('PUT', path + '/' + note.id, { title: 'Other author', content: '' }), error => error.status === 404)
})

test('drag status transport preserves task fields and rejects invalid or read-only changes', async () => {
  localStorage.clear()
  const auth = await signIn('admin@hexorait.local', 'DemoAdmin123!')
  const org = auth.organizations[0].id
  const task = (await mockApi.request('GET', '/tasks?organizationId=' + org))[0]
  const previous = structuredClone(task)
  const path = '/tasks/' + task.id + '/status'
  await mockApi.request('PATCH', path, { status: 'done', title: 'Ignored title' })
  const saved = (await mockApi.request('GET', '/tasks?organizationId=' + org)).find(x => x.id === task.id)
  assert.deepEqual(saved, { ...previous, status: 'done' })
  await assert.rejects(mockApi.request('PATCH', path, { status: 'invalid' }), error => error.status === 400)
  const state = JSON.parse(localStorage.getItem('hexorait_demo_state_v1'))
  state.memberships.find(x => x.userId === auth.user.id).role = 'ReadOnly'
  localStorage.setItem('hexorait_demo_state_v1', JSON.stringify(state))
  await assert.rejects(mockApi.request('PATCH', path, { status: 'todo' }), error => error.status === 403)
})
