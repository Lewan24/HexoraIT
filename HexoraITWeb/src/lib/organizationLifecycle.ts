import { RESOURCES } from './permissions'
import type { OrgMembership } from '../api/types'

export const CUSTOMIZABLE_MODULES = RESOURCES.filter(resource => !['dashboard', 'settings'].includes(resource))
export const TEMPORARY_MODULES: string[] = ['assets', 'passwords', 'contacts', 'contracts', 'knowledge', 'files']
export const defaultHiddenModules = (temporary: boolean): string[] => temporary
  ? CUSTOMIZABLE_MODULES.filter(resource => !TEMPORARY_MODULES.includes(resource)) : []
export const canManageOrganization = (org: Pick<OrgMembership, 'role'>) => ['Owner', 'Admin'].includes(org.role)
export const activeOrganizations = (orgs: OrgMembership[]) => orgs.filter(org => !org.isArchived)
