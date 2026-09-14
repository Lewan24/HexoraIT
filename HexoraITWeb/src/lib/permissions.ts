import type { OrganizationAccess } from '../api/types'

export const MODULE_ID = '00000000-0000-0000-0000-000000000000'
export const RESOURCES = [
  'dashboard', 'assets', 'passwords', 'networks', 'licenses', 'contacts', 'contracts',
  'plans', 'incidents', 'knowledge', 'tasks', 'projects', 'groups', 'warranty',
  'diagram', 'files', 'settings',
] as const

export function hasPermission(access: OrganizationAccess | undefined, resource: string, write = false, id?: string) {
  const module = access?.permissions.find(p => p.resource === resource && p.resourceId === MODULE_ID)
  const item = id ? access?.permissions.find(p => p.resource === resource && p.resourceId === id) : undefined
  if (!id && !write) return access?.permissions.some(p => p.resource === resource && p.canRead) ?? false
  const effective = item ?? module
  return !!effective?.canRead && (!write || effective.canWrite)
}
