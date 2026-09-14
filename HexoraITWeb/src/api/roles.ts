import { http } from './http'
import type { OrganizationAccess, OrganizationRole, OrgRole } from './types'

export const rolesApi = {
  access: (orgId: string) => http.get<OrganizationAccess>(`/organizations/${orgId}/permissions`),
  list: (orgId: string) => http.get<OrganizationRole[]>(`/organizations/${orgId}/roles`),
  create: (orgId: string, role: Omit<OrganizationRole, 'id'>) =>
    http.post<OrganizationRole>(`/organizations/${orgId}/roles`, role),
  update: (orgId: string, role: OrganizationRole) =>
    http.put<void>(`/organizations/${orgId}/roles/${role.id}`, role),
  delete: (orgId: string, roleId: string) => http.delete<void>(`/organizations/${orgId}/roles/${roleId}`),
  assign: (orgId: string, userId: string, role: OrgRole, customRoleId?: string) =>
    http.put<void>(`/organizations/${orgId}/members/${userId}/role`, { role, customRoleId }),
  resources: (orgId: string, resource: string) =>
    http.get<{ id: string; name: string }[]>(`/organizations/${orgId}/role-resources/${resource}`),
}
