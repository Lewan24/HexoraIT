import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const httpSource = await readFile(new URL('../src/api/http.ts', import.meta.url), 'utf8')
const resourcesSource = await readFile(new URL('../src/api/resources.ts', import.meta.url), 'utf8')
const rolesSource = await readFile(new URL('../src/api/roles.ts', import.meta.url), 'utf8')
const privateNotesSource = await readFile(new URL('../src/components/PrivateNotes.tsx', import.meta.url), 'utf8')

test('asset loading uses bounded automatic pagination', () => {
  assert.match(httpSource, /PAGINATION_PAGE_SIZE = 200/)
  assert.match(httpSource, /MAX_AUTOMATIC_PAGES = 100/)
  assert.match(httpSource, /page=\$\{page\}&pageSize=\$\{PAGINATION_PAGE_SIZE\}/)
  assert.match(resourcesSource, /assetsApi[\s\S]*http\.getAllPages<Asset>/)
  for (const type of [
    'License',
    'Contact',
    'Plan',
    'Incident',
    'KnowledgeArticle',
    'Group',
    'PasswordEntry',
    'Subnet',
    'Contract',
    'Project',
    'Task',
    'WarrantyItem',
    'AdminUser',
    'OrgMember',
    'FileFolder',
    'StoredFile',
  ]) {
    assert.match(resourcesSource, new RegExp(`http\\.getAllPages<${type}>`))
  }
  assert.equal((resourcesSource.match(/http\.getAllPages<OrganizationSummary>/g) ?? []).length, 2)
  assert.match(rolesSource, /http\.getAllPages<OrganizationRole>/)
  assert.match(rolesSource, /http\.getAllPages<ResourcePermission>/)
  assert.match(rolesSource, /http\.getAllPages<\{ id: string; name: string \}>/)
  assert.match(privateNotesSource, /http\.getAllPages<Note>/)
})
