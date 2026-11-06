import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import ts from 'typescript'
const compile = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText).toString('base64')
const { orderRecords } = await import(compile(fs.readFileSync(new URL('../src/lib/recordOrder.ts', import.meta.url), 'utf8')))

test('explicit indices sort ascending before unindexed records, ties have stable IDs, source is not mutated', () => {
  const source = [{ id: 'z' }, { id: 'b', sortIndex: 20 }, { id: 'a', sortIndex: 20 }, { id: 'c', sortIndex: 10 }, { id: 'd', sortIndex: null }]
  const original = JSON.stringify(source)
  assert.deepEqual(orderRecords(source).map(x => x.id), ['c', 'a', 'b', 'd', 'z'])
  assert.equal(JSON.stringify(source), original)
})

test('a cleared index returns the record to the unindexed group', () => {
  const records = [{ id: 'a', sortIndex: 10 }, { id: 'b', sortIndex: 20 }]
  assert.deepEqual(orderRecords(records.map(x => x.id === 'a' ? { ...x, sortIndex: null } : x)).map(x => x.id), ['b', 'a'])
})
