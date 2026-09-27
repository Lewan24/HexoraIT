import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')
const configSource = await read('../config.ts')
const compiledConfig = ts.transpileModule(configSource.replaceAll('import.meta.env.DEV', 'true'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext },
}).outputText
globalThis.window = { __ENV__: {} }
const { normalizeApiBaseUrl } = await import(`data:text/javascript;base64,${Buffer.from(compiledConfig).toString('base64')}`)

test('runtime API configuration accepts only normalized HTTP(S) or root-relative locations', () => {
  assert.equal(normalizeApiBaseUrl(' https://api.example.test/api/ '), 'https://api.example.test/api')
  assert.equal(normalizeApiBaseUrl('/api/'), '/api')
  assert.throws(() => normalizeApiBaseUrl('javascript:alert(1)'), /HTTP or HTTPS/)
  assert.throws(() => normalizeApiBaseUrl('not a URL'), /absolute HTTP/)
})

test('runtime configuration is present locally and mandatory in the container', async () => {
  const [index, defaultEnvironment, entrypoint, dockerfile, vite] = await Promise.all([
    read('../index.html'), read('../public/env.js'), read('../docker-entrypoint.sh'),
    read('../Dockerfile'), read('../vite.config.ts'),
  ])
  assert.match(index, /<script type="module" src="\/env\.js"><\/script>/)
  assert.match(defaultEnvironment, /window\.__ENV__/)
  assert.match(entrypoint, /HEXORAIT_API_BASE_URL is required/)
  assert.match(dockerfile, /RUN npm ci/)
  assert.match(vite, /process\.env\.HOST \?\? '127\.0\.0\.1'/)
})

test('file write controls and client-side upload limits follow backend permissions', async () => {
  const explorer = await read('../src/components/FileExplorer.tsx')
  assert.match(explorer, /MAX_UPLOAD_BYTES = 100_000_000/)
  assert.match(explorer, /MAX_FILES_PER_BATCH = 20/)
  assert.match(explorer, /const canCreate = canWrite\('files'\)/)
  assert.match(explorer, /canWrite\('files', file\.id\)/)
  assert.match(explorer, /disabled=\{uploading \|\| !canCreate\}/)
  assert.match(explorer, /maxLength=\{renameTarget\.type === 'folder' \? 200 : 260\}/)
})
