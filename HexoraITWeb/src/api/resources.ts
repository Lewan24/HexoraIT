import { http, qs } from './http'
import type {
  Asset, PasswordEntry, Subnet, IPEntry, License, Contact, Contract,
  Plan, Incident, KnowledgeArticle, Task, Group, WarrantyItem,
  DiagramNode, DiagramEdge, Organization, OrganizationSummary,
  OrgMember,
  OrgRole,
  AdminUser,
  SystemRole,
  Project,
  DashboardLayout,
  FileFolder,
  StoredFile,
} from './types'

const requiredApiDate = (value: string) => value || '0001-01-01'

export const adminApi = {
  getUsers: () => http.getAllPages<AdminUser>('/admin/users'),
  createUser: (email: string, displayName: string, password: string, systemRole: SystemRole) => http.post<AdminUser>('/admin/users', {email, displayName, password, systemRole}),
  setBlocked: (id: string, blocked: boolean) => http.patch<void>(`/admin/users/${id}/block${qs({ blocked: blocked ? 'true' : 'false' })}`),
  setRole: (id: string, systemRole: SystemRole) => http.patch<void>(`/admin/users/${id}/role`, { systemRole }),
  resetPassword: (id: string, newPassword: string) => http.post<void>(`/admin/users/${id}/reset-password`, { newPassword }),
}

export const dashboardApi = {
  get: (organizationId: string) => http.get<DashboardLayout | null>(`/dashboard-layout${qs({ organizationId })}`),
  save: (organizationId: string, layout: DashboardLayout) =>
    http.put<void>(`/dashboard-layout${qs({ organizationId })}`, layout),
  reset: (organizationId: string) => http.delete<void>(`/dashboard-layout${qs({ organizationId })}`),
}

export const organizationsApi = {
  getAll: () => http.getAllPages<OrganizationSummary>('/organizations'),
  getDeleted: () => http.getAllPages<OrganizationSummary>('/organizations/deleted'),
  getById: (id: string) => http.get<Organization>(`/organizations/${id}`),
  create: (data: Omit<Organization, 'id'>) => http.post<Organization>('/organizations', data),
  update: (id: string, data: Omit<Organization, 'id'>) => http.put<void>(`/organizations/${id}`, data),
  getMembers: (id: string) => http.getAllPages<OrgMember>(`/organizations/${id}/members`),
  inviteMember: (id: string, email: string, role: OrgRole, customRoleId?: string) =>
    http.post<OrgMember>(`/organizations/${id}/members`, { email, role, customRoleId }),
  removeMember: (id: string, userId: string) => http.delete<void>(`/organizations/${id}/members/${userId}`),
  softDelete: (id: string) => http.delete<void>(`/organizations/${id}`),
  restore: (id: string) => http.post<void>(`/organizations/${id}/restore`),
}

export const assetsApi = {
  getAll: (organizationId: string) => http.getAllPages<Asset>(`/assets${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<Asset, 'id' | 'updatedAt'>) =>
    http.post<Asset>(`/assets${qs({ organizationId })}`, data),
  update: (id: string, data: Omit<Asset, 'id' | 'updatedAt'>) => http.put<void>(`/assets/${id}`, data),
  delete: (id: string) => http.delete<void>(`/assets/${id}`),
  toggleStar: (id: string) => http.patch<{ starred: boolean }>(`/assets/${id}/star`),
}

export const passwordsApi = {
  getAll: (organizationId: string) => http.getAllPages<PasswordEntry>(`/passwords${qs({ organizationId })}`),
  reveal: (id: string) => http.getString(`/passwords/${id}/reveal`),
  create: (organizationId: string, data: Omit<PasswordEntry, 'id' | 'updatedAt' | 'strength'> & { password: string }) =>
    http.post<PasswordEntry>(`/passwords${qs({ organizationId })}`, data),
  update: (id: string, data: Omit<PasswordEntry, 'id' | 'updatedAt' | 'strength'> & { password?: string }) =>
    http.put<void>(`/passwords/${id}`, data),
  delete: (id: string) => http.delete<void>(`/passwords/${id}`),
  toggleStar: (id: string) => http.patch<{ starred: boolean }>(`/passwords/${id}/star`),
}

export const subnetsApi = {
  getAll: (organizationId: string) => http.getAllPages<Subnet>(`/subnets${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<Subnet, 'id' | 'ips'>) =>
    http.post<Subnet>(`/subnets${qs({ organizationId })}`, data),
  update: (id: string, data: Omit<Subnet, 'id' | 'ips'>) => http.put<void>(`/subnets/${id}`, data),
  delete: (id: string) => http.delete<void>(`/subnets/${id}`),
  addIp: (subnetId: string, data: Omit<IPEntry, 'id'>) => http.post<IPEntry>(`/subnets/${subnetId}/ips`, data),
  updateIp: (subnetId: string, entry: IPEntry) => http.put<void>(`/subnets/${subnetId}/ips/${entry.id}`, entry),
  deleteIp: (subnetId: string, entryId: string) => http.delete<void>(`/subnets/${subnetId}/ips/${entryId}`),
}

export const licensesApi = {
  getAll: (organizationId: string) => http.getAllPages<License>(`/licenses${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<License, 'id' | 'status'>) =>
    http.post<License>(`/licenses${qs({ organizationId })}`, { ...data, purchaseDate: requiredApiDate(data.purchaseDate), expiryDate: requiredApiDate(data.expiryDate) }),
  update: (id: string, data: Omit<License, 'id' | 'status'>) => http.put<void>(`/licenses/${id}`, { ...data, purchaseDate: requiredApiDate(data.purchaseDate), expiryDate: requiredApiDate(data.expiryDate) }),
  delete: (id: string) => http.delete<void>(`/licenses/${id}`),
  toggleStar: (id: string) => http.patch<{ starred: boolean }>(`/licenses/${id}/star`),
}

export const contactsApi = {
  getAll: (organizationId: string) => http.getAllPages<Contact>(`/contacts${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<Contact, 'id'>) =>
    http.post<Contact>(`/contacts${qs({ organizationId })}`, data),
  update: (id: string, data: Omit<Contact, 'id'>) => http.put<void>(`/contacts/${id}`, data),
  delete: (id: string) => http.delete<void>(`/contacts/${id}`),
  toggleStar: (id: string) => http.patch<{ starred: boolean }>(`/contacts/${id}/star`),
}

export const contractsApi = {
  getAll: (organizationId: string) => http.getAllPages<Contract>(`/contracts${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<Contract, 'id' | 'status'>) =>
    http.post<Contract>(`/contracts${qs({ organizationId })}`, { ...data, startDate: requiredApiDate(data.startDate), endDate: requiredApiDate(data.endDate) }),
  update: (id: string, data: Omit<Contract, 'id' | 'status'>) => http.put<void>(`/contracts/${id}`, { ...data, startDate: requiredApiDate(data.startDate), endDate: requiredApiDate(data.endDate) }),
  delete: (id: string) => http.delete<void>(`/contracts/${id}`),
  toggleStar: (id: string) => http.patch<{ starred: boolean }>(`/contracts/${id}/star`),
  uploadDocument: (id: string, file: File) => http.upload<Contract>(`/contracts/${id}/document`, file),
  downloadDocument: (id: string) => http.getBlob(`/contracts/${id}/document`),
}

export const plansApi = {
  getAll: (organizationId: string) => http.getAllPages<Plan>(`/plans${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<Plan, 'id' | 'createdAt'>) =>
    http.post<Plan>(`/plans${qs({ organizationId })}`, { ...data, targetDate: requiredApiDate(data.targetDate) }),
  update: (id: string, data: Omit<Plan, 'id' | 'createdAt'>) => http.put<void>(`/plans/${id}`, { ...data, targetDate: requiredApiDate(data.targetDate) }),
  delete: (id: string) => http.delete<void>(`/plans/${id}`),
}

export const incidentsApi = {
  getAll: (organizationId: string) => http.getAllPages<Incident>(`/incidents${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<Incident, 'id'>) =>
    http.post<Incident>(`/incidents${qs({ organizationId })}`, { ...data, occurredAt: data.occurredAt || new Date().toISOString(), resolvedAt: data.resolvedAt || null }),
  update: (id: string, data: Omit<Incident, 'id'>) => http.put<void>(`/incidents/${id}`, { ...data, occurredAt: data.occurredAt || new Date().toISOString(), resolvedAt: data.resolvedAt || null }),
  delete: (id: string) => http.delete<void>(`/incidents/${id}`),
}

export const knowledgeApi = {
  getAll: (organizationId: string) => http.getAllPages<KnowledgeArticle>(`/knowledge${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<KnowledgeArticle, 'id' | 'updatedAt'>) =>
    http.post<KnowledgeArticle>(`/knowledge${qs({ organizationId })}`, data),
  update: (id: string, data: Omit<KnowledgeArticle, 'id' | 'updatedAt'>) => http.put<void>(`/knowledge/${id}`, data),
  delete: (id: string) => http.delete<void>(`/knowledge/${id}`),
  toggleStar: (id: string) => http.patch<{ starred: boolean }>(`/knowledge/${id}/star`),
}

export const projectsApi = {
  getAll: (organizationId: string) => http.getAllPages<Project>(`/projects${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<Project, 'id' | 'createdAt' | 'taskCount'>) =>
    http.post<Project>(`/projects${qs({ organizationId })}`, data),
  update: (id: string, data: Omit<Project, 'id' | 'createdAt' | 'taskCount'>) => http.put<void>(`/projects/${id}`, data),
  delete: (id: string) => http.delete<void>(`/projects/${id}`),
}

export const tasksApi = {
  getAll: (organizationId: string) => http.getAllPages<Task>(`/tasks${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<Task, 'id' | 'createdAt'>) =>
    http.post<Task>(`/tasks${qs({ organizationId })}`, { ...data, dueDate: requiredApiDate(data.dueDate) }),
  update: (id: string, data: Omit<Task, 'id' | 'createdAt'>) => http.put<void>(`/tasks/${id}`, { ...data, dueDate: requiredApiDate(data.dueDate) }),
  delete: (id: string) => http.delete<void>(`/tasks/${id}`),
}

export const groupsApi = {
  getAll: (organizationId: string) => http.getAllPages<Group>(`/groups${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<Group, 'id' | 'createdAt'>) =>
    http.post<Group>(`/groups${qs({ organizationId })}`, data),
  update: (id: string, data: Omit<Group, 'id' | 'createdAt'>) => http.put<void>(`/groups/${id}`, data),
  delete: (id: string) => http.delete<void>(`/groups/${id}`),
}

export const warrantyApi = {
  getAll: (organizationId: string) => http.getAllPages<WarrantyItem>(`/warranties${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<WarrantyItem, 'status'>) =>
    http.post<WarrantyItem>(`/warranties${qs({ organizationId })}`, { ...data, purchaseDate: requiredApiDate(data.purchaseDate), warrantyEndDate: requiredApiDate(data.warrantyEndDate) }),
  update: (id: string, data: Omit<WarrantyItem, 'id' | 'status'>) => http.put<void>(`/warranties/${id}`, { ...data, purchaseDate: requiredApiDate(data.purchaseDate), warrantyEndDate: requiredApiDate(data.warrantyEndDate) }),
  delete: (id: string) => http.delete<void>(`/warranties/${id}`),
  toggleStar: (id: string) => http.patch<{ starred: boolean }>(`/warranties/${id}/star`),
  uploadDocument: (id: string, file: File) => http.upload<WarrantyItem>(`/warranties/${id}/document`, file),
  downloadDocument: (id: string) => http.getBlob(`/warranties/${id}/document`),
}

export const diagramApi = {
  get: (organizationId: string) => http.get<{ nodes: DiagramNode[]; edges: DiagramEdge[] }>(`/diagram${qs({ organizationId })}`),
  save: (organizationId: string, nodes: DiagramNode[], edges: DiagramEdge[]) =>
    http.put<void>(`/diagram${qs({ organizationId })}`, { nodes, edges }),
}

export const filesApi = {
  getFolders: (organizationId: string, parentFolderId?: string) =>
    http.getAllPages<FileFolder>(`/files/folders${qs({ organizationId, parentFolderId })}`),
  createFolder: (organizationId: string, name: string, parentFolderId?: string) =>
    http.post<FileFolder>(`/files/folders${qs({ organizationId })}`, { name, parentFolderId }),
  deleteFolder: (id: string) => http.delete<void>(`/files/folders/${id}`),

  getFiles: (organizationId: string, folderId?: string) =>
    http.getAllPages<StoredFile>(`/files${qs({ organizationId, folderId })}`),
  upload: (organizationId: string, file: File, folderId?: string) =>
    http.upload<StoredFile>(`/files/upload${qs({ organizationId, folderId })}`, file),
  deleteFile: (id: string) => http.delete<void>(`/files/${id}`),
  getContentBlob: (id: string) => http.getBlob(`/files/${id}/content`),
  downloadFile: (id: string) => http.getBlob(`/files/${id}/download`),
  renameFolder: (id: string, name: string) => http.patch<void>(`/files/folders/${id}`, { name }),
  moveFolder: (id: string, newParentFolderId?: string) => http.patch<void>(`/files/folders/${id}/move`, { newParentFolderId }),
  renameFile: (id: string, name: string) => http.patch<void>(`/files/${id}`, { name }),
  moveFile: (id: string, newFolderId?: string) => http.patch<void>(`/files/${id}/move`, { newFolderId }),
}

export const versionApi = {
  getCurrentVersion: () => 
    http.getString(`/version`),
  getLatestVersion: () => 
    http.getString(`/version/latest`)
}

export interface GlobalEmailSettings {
  enabled: boolean; host: string; port: number; useTls: boolean; username: string
  hasPassword: boolean; fromAddress: string; fromName: string
}

export interface OrganizationNotificationSettings {
  emailServiceAvailable: boolean; licenseExpiring: boolean; clientTaskCreated: boolean
  incidentCreated: boolean; contractExpiring: boolean; warrantyExpiring: boolean
  roleOrMembershipChanged: boolean; expiryWarningDays: number
}

export const emailSettingsApi = {
  getGlobal: () => http.get<GlobalEmailSettings>('/admin/email-settings'),
  updateGlobal: (data: GlobalEmailSettings & { password?: string }) => http.put<GlobalEmailSettings>('/admin/email-settings', data),
  test: (recipient: string) => http.post<void>('/admin/email-settings/test', { recipient }),
  getOrganization: (organizationId: string) => http.get<OrganizationNotificationSettings>(`/organizations/${organizationId}/notification-settings`),
  updateOrganization: (organizationId: string, data: Omit<OrganizationNotificationSettings, 'emailServiceAvailable'>) =>
    http.put<void>(`/organizations/${organizationId}/notification-settings`, data),
}
