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
