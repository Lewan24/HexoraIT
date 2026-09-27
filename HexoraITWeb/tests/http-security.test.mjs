import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/api/http.ts', import.meta.url), 'utf8')
  .replace('import { config } from "../../config"', 'const config = { apiBaseUrl: "https://api.example.test" }')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext },
}).outputText

const storage = new Map()
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key),
}
globalThis.window = { dispatchEvent() {} }
const { ApiError, authTokenStorage, http, setUnauthorizedHandler } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
)

test.afterEach(() => {
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  }
  storage.clear()
  authTokenStorage.clear()
  setUnauthorizedHandler(null)
})

test('unauthenticated 401 preserves Problem Details and does not expire a session', async () => {
  let unauthorizedCalls = 0
  setUnauthorizedHandler(() => { unauthorizedCalls += 1 })
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Invalid email or password.' }), {
    status: 401,
    headers: { 'Content-Type': 'application/problem+json' },
  })

  await assert.rejects(http.post('/auth/login', { email: 'a@b.test', password: 'wrong' }), error => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.status, 401)
    assert.equal(error.message, 'Invalid email or password.')
    return true
  })
  assert.equal(unauthorizedCalls, 0)
})

test('authenticated 401 clears the active session through the global handler', async () => {
  authTokenStorage.set('expired-token')
  let unauthorizedCalls = 0
  setUnauthorizedHandler(() => { unauthorizedCalls += 1; authTokenStorage.clear() })
  globalThis.fetch = async () => new Response(null, { status: 401, statusText: 'Unauthorized' })

  await assert.rejects(http.get('/auth/me'), error => error instanceof ApiError && error.message.startsWith('Session expired'))
  assert.equal(unauthorizedCalls, 1)
  assert.equal(authTokenStorage.get(), null)
})

test('validation Problem Details exposes the first actionable field error', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    title: 'One or more validation errors occurred.',
    errors: { Name: ['Name must contain at most 200 characters.'] },
  }), { status: 400, headers: { 'Content-Type': 'application/problem+json' } })

  await assert.rejects(http.post('/assets', {}), error => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.message, 'Name must contain at most 200 characters.')
    assert.deepEqual(error.details.errors.Name, ['Name must contain at most 200 characters.'])
    return true
  })
})

test('common API failures preserve their status and Problem Details message', async t => {
  for (const status of [400, 403, 404, 409, 422, 429]) {
    await t.test(String(status), async () => {
      globalThis.fetch = async () => new Response(JSON.stringify({ detail: `failure-${status}` }), {
        status,
        headers: { 'Content-Type': 'application/problem+json' },
      })
      await assert.rejects(http.get('/resource'), error => {
        assert.ok(error instanceof ApiError)
        assert.equal(error.status, status)
        assert.equal(error.message, `failure-${status}`)
        return true
      })
    })
  }
})

test('network failures use a consistent status-zero API error', async () => {
  globalThis.fetch = async () => { throw new TypeError('network unavailable') }
  await assert.rejects(http.get('/resource'), error => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.status, 0)
    assert.equal(error.message, 'Unable to connect to the server.')
    return true
  })
})

test('disabled localStorage falls back to an in-memory bearer token', async () => {
  globalThis.localStorage = {
    getItem() { throw new Error('disabled') },
    setItem() { throw new Error('disabled') },
    removeItem() { throw new Error('disabled') },
  }
  authTokenStorage.set('memory-token')
  let authorization
  globalThis.fetch = async (_url, options) => {
    authorization = options.headers.Authorization
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  assert.deepEqual(await http.get('/health'), { ok: true })
  assert.equal(authorization, 'Bearer memory-token')
})
