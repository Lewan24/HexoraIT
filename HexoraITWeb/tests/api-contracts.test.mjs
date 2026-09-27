import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const types = await readFile(new URL('../src/api/types.ts', import.meta.url), 'utf8')
const resources = await readFile(new URL('../src/api/resources.ts', import.meta.url), 'utf8')
const incidents = await readFile(new URL('../src/components/IncidentLog.tsx', import.meta.url), 'utf8')

test('asset and password timestamps match backend updatedAt DTO fields', () => {
  assert.match(types, /interface Asset[\s\S]*updatedAt: string/)
  assert.match(types, /interface PasswordEntry[\s\S]*updatedAt: string/)
  assert.doesNotMatch(resources, /'updated'/)
})

test('an unresolved incident sends null instead of an invalid empty DateTime', () => {
  assert.match(types, /resolvedAt: string \| null/)
  assert.match(incidents, /resolvedAt: form\.resolvedAt \|\| null/)
})

test('optional UI dates are normalized to valid non-null backend date values', () => {
  assert.match(resources, /requiredApiDate = \(value: string\) => value \|\| '0001-01-01'/)
  for (const field of ['purchaseDate', 'startDate', 'targetDate', 'dueDate']) {
    assert.match(resources, new RegExp(`${field}: requiredApiDate\\(data\\.${field}\\)`))
  }
  assert.match(resources, /resolvedAt: data\.resolvedAt \|\| null/)
})
