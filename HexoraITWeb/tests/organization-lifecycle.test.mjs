import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import ts from 'typescript'
import { RESOURCES } from '../src/lib/permissions.ts'

const source = fs.readFileSync(new URL('../src/lib/organizationLifecycle.ts', import.meta.url), 'utf8')
  .replace("import { RESOURCES } from './permissions'", `const RESOURCES = ${JSON.stringify(RESOURCES)}`)
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext } }).outputText
const { CUSTOMIZABLE_MODULES, defaultHiddenModules, activeOrganizations, canManageOrganization } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

test('temporary organizations enable exactly the six engagement modules by default', () => {
  const hidden = defaultHiddenModules(true)
  assert.deepEqual(CUSTOMIZABLE_MODULES.filter(resource => !hidden.includes(resource)).sort(), ['assets', 'passwords', 'contacts', 'contracts', 'knowledge', 'files'].sort())
  assert.ok(!hidden.includes('dashboard'))
  assert.ok(!hidden.includes('settings'))
  assert.deepEqual(defaultHiddenModules(false), [])
  hidden.push('assets')
  assert.ok(!defaultHiddenModules(true).includes('assets'), 'preset mutations must not leak to other organizations')
})

test('archived permanent and temporary organizations are excluded from the active switcher', () => {
  const orgs = [
    { id: 'permanent', isTemporary: false, isArchived: false },
    { id: 'job', isTemporary: true, isArchived: false },
    { id: 'completed', isTemporary: true, isArchived: true },
    { id: 'former-company', isTemporary: false, isArchived: true },
  ]
  assert.deepEqual(activeOrganizations(orgs).map(org => org.id), ['permanent', 'job'])
  orgs[2].isArchived = false
  assert.deepEqual(activeOrganizations(orgs).map(org => org.id), ['permanent', 'job', 'completed'])
})

test('only organization owners and administrators see lifecycle management actions', () => {
  for (const role of ['Owner', 'Admin']) assert.equal(canManageOrganization({ role }), true)
  for (const role of ['Member', 'ReadOnly', 'Custom', undefined]) assert.equal(canManageOrganization({ role }), false)
})

test('the global hub is independent of organization permissions and clients retain their report landing page', () => {
  const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
  const gate = fs.readFileSync(new URL('../src/components/PermissionGate.tsx', import.meta.url), 'utf8')
  assert.match(app, /user\?\.systemRole === 'Client' \? 'reports' : 'home'/)
  assert.match(gate, /if \(view === 'home'\) return isClient/)
  assert.ok(gate.indexOf("if (view === 'home')") < gate.indexOf('if (!currentOrg)'))
})

test('archiving closes company views while keeping global account settings and help accessible', async () => {
  const vm = await import('node:vm')
  const source = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
  const parsed = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const redirect = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'OrganizationLifecycleRedirect')
  assert.ok(redirect)
  const code = ts.transpileModule(redirect.getText(parsed), { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText
  const navigated = []
  const context = vm.createContext({
    useApp: () => ({ currentOrg: { isArchived: true } }),
    useAuth: () => ({ user: { systemRole: 'User' } }),
    useEffect: fn => fn(),
  })
  vm.runInContext(code, context)
  for (const view of ['home', 'settings', 'help', 'adminpanel']) context.OrganizationLifecycleRedirect({ view, navigate: target => navigated.push(target) })
  assert.deepEqual(navigated, [])
  for (const view of ['dashboard', 'passwords', 'files', 'organization-customization']) context.OrganizationLifecycleRedirect({ view, navigate: target => navigated.push(target) })
  assert.deepEqual(navigated, ['home', 'home', 'home', 'home'])
  context.useApp = () => ({ currentOrg: { isArchived: false } })
  navigated.length = 0
  context.OrganizationLifecycleRedirect({ view: 'dashboard', navigate: target => navigated.push(target) })
  assert.deepEqual(navigated, [])
})
