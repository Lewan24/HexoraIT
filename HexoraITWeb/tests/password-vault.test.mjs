import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { parsePasswordFile, passwordTitle } from '../src/lib/passwordImport.ts'
import { randomPassword, randomPassphrase } from '../src/lib/passwordGenerator.ts'

test('Bitwarden import extracts login credentials, preserves spaces in secrets, and ignores folders', () => {
  const file = {
    encrypted: false,
    folders: [{ id: 'folder', name: 'Network' }],
    items: [
      { type: 1, folderId: 'folder', name: ' Admin VPN ', login: { username: null, password: ' sample ' } },
      { type: 2, name: 'Note', notes: 'Only login passwords are imported' },
      { type: 1, name: 'Passkey only', login: { username: 'sample', password: null } },
      { type: 1, name: '', login: { username: 'sample', password: 'sample' } },
    ],
  }
  assert.deepEqual(parsePasswordFile(JSON.stringify(file), 'json'), {
    entries: [{ name: 'Admin VPN', username: '', password: ' sample ', row: 1 }],
    skipped: 2,
    invalidRows: [4],
  })
  assert.throws(() => parsePasswordFile('{"encrypted":true}', 'json'), /unencrypted/)
  assert.equal(passwordTitle(' CAFÉ '), passwordTitle('cafe\u0301'))
})

test('TXT import reads the last two fields as login and password and reports malformed lines', () => {
  assert.deepEqual(parsePasswordFile('\uFEFFAdmin VPN john demo123\r\n\r\nmissing-login\nRouter\troot\tpass', 'txt'), {
    entries: [
      { name: 'Admin VPN', username: 'john', password: 'demo123', row: 1 },
      { name: 'Router', username: 'root', password: 'pass', row: 4 },
    ],
    skipped: 0,
    invalidRows: [3],
  })
})

test('character generator includes chosen groups and respects exclusions', () => {
  for (let index = 0; index < 20; index++) {
    const value = randomPassword(24, ['lowercase', 'digits'], 'a01')
    assert.match(value, /^[b-z2-9]{24}$/)
    assert.match(value, /[b-z]/)
    assert.match(value, /[2-9]/)
  }
  assert.throws(() => randomPassword(20, ['digits'], '0123456789'), /allowed character/)
  assert.throws(() => randomPassword(7, ['lowercase'], ''), /8 to 128/)
})

function readWordList(file) {
  return readFileSync(new URL('../src/lib/' + file, import.meta.url), 'utf8')
    .trim().split(/\r?\n/).map(line => line.split('\t')[1])
}

test('passphrase generator uses the full English word list and inserts the number at the requested position', () => {
  const dictionary = readWordList('eff-large-wordlist.txt')
  const words = new Set(dictionary)
  assert.equal(words.size, 7776)
  assert.ok(dictionary.every(word => /^[a-z]+(?:-[a-z]+)?$/.test(word)))
  for (const position of ['none', 'start', 'end', 'random']) {
    const parts = randomPassphrase(dictionary, 6, ':', position).split(':')
    assert.equal(parts.filter(part => words.has(part)).length, 6)
    assert.equal(parts.filter(part => /^\d{2}$/.test(part)).length, position === 'none' ? 0 : 1)
    if (position === 'start') assert.match(parts[0], /^\d{2}$/)
    if (position === 'end') assert.match(parts.at(-1), /^\d{2}$/)
  }
})

test('both Polish word lists have 7776 unique words and support independent passphrase generation', () => {
  for (const [file, alphabet] of [
    ['diceware-pl.txt', /^[a-z]+$/u],
    ['diceware-pl-ogonki.txt', /^[a-ząćęłńóśźż]+$/u],
  ]) {
    const dictionary = readWordList(file)
    assert.equal(dictionary.length, 7776)
    const words = new Set(dictionary.map(word => word.normalize('NFC')))
    assert.equal(words.size, 7776)
    assert.ok(dictionary.every(word => alphabet.test(word)))
    const parts = randomPassphrase(dictionary, 6, '-', 'none').split('-')
    assert.equal(parts.length, 6)
    assert.ok(parts.every(word => words.has(word)))
  }
  assert.ok(readWordList('diceware-pl-ogonki.txt').some(word => /[ąćęłńóśźż]/u.test(word)))
})

test('capitalization changes only the first letter of each word, including Polish letters', () => {
  const dictionary = Array(7776).fill('łódka')
  assert.equal(randomPassphrase(dictionary, 4, '-', 'none'), 'łódka-łódka-łódka-łódka')
  assert.match(randomPassphrase(dictionary, 4, '-', 'end', true), /^Łódka-Łódka-Łódka-Łódka-\d{2}$/u)
})
