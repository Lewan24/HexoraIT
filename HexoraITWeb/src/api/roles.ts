import { http } from './http'
import type { OrganizationAccess, OrganizationRole, OrgRole, ResourcePermission } from './types'

export const rolesApi = {
  createClient: (orgId: string, data: { email: string; displayName: string; password: string }) => http.post(`/organizations/${orgId}/clients`, data),
  clientPermissions: (orgId: string, clientId: string) => http.get<ResourcePermission[]>(`/organizations/${orgId}/clients/${clientId}/permissions`),
  saveClientPermissions: (orgId: string, clientId: string, data: Omit<OrganizationRole, 'id'>) => http.put(`/organizations/${orgId}/clients/${clientId}/permissions`, data),
  copy: (orgId: string, roleId: string, organizationIds: string[], overwrite = false) => http.post(`/organizations/${orgId}/roles/${roleId}/copy`, { organizationIds, overwrite }),
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
