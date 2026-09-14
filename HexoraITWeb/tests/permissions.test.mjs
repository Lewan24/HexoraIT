import assert from 'node:assert/strict'
import test from 'node:test'
import { hasPermission, MODULE_ID } from '../src/lib/permissions.ts'

const itemId = '11111111-1111-1111-1111-111111111111'
const otherId = '22222222-2222-2222-2222-222222222222'
const rule = (resourceId, canRead, canWrite) => ({ resource: 'passwords', resourceId, canRead, canWrite })
const access = (...permissions) => ({ roleName: 'Test', canManageRoles: false, permissions })

test('an individual grant opens the section but only authorizes the selected item', () => {
  const permissions = access(rule(MODULE_ID, false, false), rule(itemId, true, true))
  assert.equal(hasPermission(permissions, 'passwords'), true)
  assert.equal(hasPermission(permissions, 'passwords', true), false)
  assert.equal(hasPermission(permissions, 'passwords', false, itemId), true)
  assert.equal(hasPermission(permissions, 'passwords', true, itemId), true)
  assert.equal(hasPermission(permissions, 'passwords', false, otherId), false)
  assert.equal(hasPermission(permissions, 'passwords', true, otherId), false)
})

test('individual deny and read-only rules override module write permission', () => {
  const permissions = access(rule(MODULE_ID, true, true), rule(itemId, false, false), rule(otherId, true, false))
  assert.equal(hasPermission(permissions, 'passwords', false, itemId), false)
  assert.equal(hasPermission(permissions, 'passwords', true, itemId), false)
  assert.equal(hasPermission(permissions, 'passwords', false, otherId), true)
  assert.equal(hasPermission(permissions, 'passwords', true, otherId), false)
})

test('removing an individual rule restores the default and missing access denies everything', () => {
  assert.equal(hasPermission(access(rule(MODULE_ID, true, true)), 'passwords', true, itemId), true)
  assert.equal(hasPermission(access(), 'passwords'), false)
  assert.equal(hasPermission(undefined, 'passwords', true, itemId), false)
  assert.equal(hasPermission(access(rule(itemId, true, false)), 'passwords', false, itemId), true)
})
