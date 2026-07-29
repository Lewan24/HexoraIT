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

export const adminApi = {
  getUsers: () => http.get<AdminUser[]>('/admin/users'),
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
  getAll: () => http.get<OrganizationSummary[]>('/organizations'),
  getDeleted: () => http.get<OrganizationSummary[]>('/organizations/deleted'),
  getById: (id: string) => http.get<Organization>(`/organizations/${id}`),
  create: (data: Omit<Organization, 'id'>) => http.post<Organization>('/organizations', data),
  update: (id: string, data: Omit<Organization, 'id'>) => http.put<void>(`/organizations/${id}`, data),
  getMembers: (id: string) => http.get<OrgMember[]>(`/organizations/${id}/members`),
  inviteMember: (id: string, email: string, role: OrgRole) =>
    http.post<OrgMember>(`/organizations/${id}/members`, { email, role }),
  removeMember: (id: string, userId: string) => http.delete<void>(`/organizations/${id}/members/${userId}`),
  softDelete: (id: string) => http.delete<void>(`/organizations/${id}`),
  restore: (id: string) => http.post<void>(`/organizations/${id}/restore`),
}

export const assetsApi = {
  getAll: (organizationId: string) => http.get<Asset[]>(`/assets${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<Asset, 'id' | 'updated'>) =>
    http.post<Asset>(`/assets${qs({ organizationId })}`, data),
  update: (id: string, data: Omit<Asset, 'id' | 'updated'>) => http.put<void>(`/assets/${id}`, data),
  delete: (id: string) => http.delete<void>(`/assets/${id}`),
  toggleStar: (id: string) => http.patch<{ starred: boolean }>(`/assets/${id}/star`),
}

export const passwordsApi = {
  getAll: (organizationId: string) => http.get<PasswordEntry[]>(`/passwords${qs({ organizationId })}`),
  reveal: (id: string) => http.getString(`/passwords/${id}/reveal`),
  create: (organizationId: string, data: Omit<PasswordEntry, 'id' | 'updated' | 'strength'> & { password: string }) =>
    http.post<PasswordEntry>(`/passwords${qs({ organizationId })}`, data),
  update: (id: string, data: Omit<PasswordEntry, 'id' | 'updated' | 'strength'> & { password?: string }) =>
    http.put<void>(`/passwords/${id}`, data),
  delete: (id: string) => http.delete<void>(`/passwords/${id}`),
  toggleStar: (id: string) => http.patch<{ starred: boolean }>(`/passwords/${id}/star`),
}

export const subnetsApi = {
  getAll: (organizationId: string) => http.get<Subnet[]>(`/subnets${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<Subnet, 'id' | 'ips'>) =>
    http.post<Subnet>(`/subnets${qs({ organizationId })}`, data),
  update: (id: string, data: Omit<Subnet, 'id' | 'ips'>) => http.put<void>(`/subnets/${id}`, data),
  delete: (id: string) => http.delete<void>(`/subnets/${id}`),
  addIp: (subnetId: string, data: Omit<IPEntry, 'id'>) => http.post<IPEntry>(`/subnets/${subnetId}/ips`, data),
  updateIp: (subnetId: string, entry: IPEntry) => http.put<void>(`/subnets/${subnetId}/ips/${entry.id}`, entry),
  deleteIp: (subnetId: string, entryId: string) => http.delete<void>(`/subnets/${subnetId}/ips/${entryId}`),
}

export const licensesApi = {
  getAll: (organizationId: string) => http.get<License[]>(`/licenses${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<License, 'id' | 'status'>) =>
    http.post<License>(`/licenses${qs({ organizationId })}`, data),
  update: (id: string, data: Omit<License, 'id' | 'status'>) => http.put<void>(`/licenses/${id}`, data),
  delete: (id: string) => http.delete<void>(`/licenses/${id}`),
  toggleStar: (id: string) => http.patch<{ starred: boolean }>(`/licenses/${id}/star`),
}

export const contactsApi = {
  getAll: (organizationId: string) => http.get<Contact[]>(`/contacts${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<Contact, 'id'>) =>
    http.post<Contact>(`/contacts${qs({ organizationId })}`, data),
  update: (id: string, data: Omit<Contact, 'id'>) => http.put<void>(`/contacts/${id}`, data),
  delete: (id: string) => http.delete<void>(`/contacts/${id}`),
  toggleStar: (id: string) => http.patch<{ starred: boolean }>(`/contacts/${id}/star`),
}

export const contractsApi = {
  getAll: (organizationId: string) => http.get<Contract[]>(`/contracts${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<Contract, 'id' | 'status'>) =>
    http.post<Contract>(`/contracts${qs({ organizationId })}`, data),
  update: (id: string, data: Omit<Contract, 'id' | 'status'>) => http.put<void>(`/contracts/${id}`, data),
  delete: (id: string) => http.delete<void>(`/contracts/${id}`),
  toggleStar: (id: string) => http.patch<{ starred: boolean }>(`/contracts/${id}/star`),
  uploadDocument: (id: string, file: File) => http.upload<Contract>(`/contracts/${id}/document`, file),
  downloadDocument: (id: string) => http.getBlob(`/contracts/${id}/document`),
}

export const plansApi = {
  getAll: (organizationId: string) => http.get<Plan[]>(`/plans${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<Plan, 'id' | 'createdAt'>) =>
    http.post<Plan>(`/plans${qs({ organizationId })}`, data),
  update: (id: string, data: Omit<Plan, 'id' | 'createdAt'>) => http.put<void>(`/plans/${id}`, data),
  delete: (id: string) => http.delete<void>(`/plans/${id}`),
}

export const incidentsApi = {
  getAll: (organizationId: string) => http.get<Incident[]>(`/incidents${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<Incident, 'id'>) =>
    http.post<Incident>(`/incidents${qs({ organizationId })}`, data),
  update: (id: string, data: Omit<Incident, 'id'>) => http.put<void>(`/incidents/${id}`, data),
  delete: (id: string) => http.delete<void>(`/incidents/${id}`),
}

export const knowledgeApi = {
  getAll: (organizationId: string) => http.get<KnowledgeArticle[]>(`/knowledge${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<KnowledgeArticle, 'id' | 'updatedAt'>) =>
    http.post<KnowledgeArticle>(`/knowledge${qs({ organizationId })}`, data),
  update: (id: string, data: Omit<KnowledgeArticle, 'id' | 'updatedAt'>) => http.put<void>(`/knowledge/${id}`, data),
  delete: (id: string) => http.delete<void>(`/knowledge/${id}`),
  toggleStar: (id: string) => http.patch<{ starred: boolean }>(`/knowledge/${id}/star`),
}

export const projectsApi = {
  getAll: (organizationId: string) => http.get<Project[]>(`/projects${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<Project, 'id' | 'createdAt' | 'taskCount'>) =>
    http.post<Project>(`/projects${qs({ organizationId })}`, data),
  update: (id: string, data: Omit<Project, 'id' | 'createdAt' | 'taskCount'>) => http.put<void>(`/projects/${id}`, data),
  delete: (id: string) => http.delete<void>(`/projects/${id}`),
}

export const tasksApi = {
  getAll: (organizationId: string) => http.get<Task[]>(`/tasks${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<Task, 'id' | 'createdAt'>) =>
    http.post<Task>(`/tasks${qs({ organizationId })}`, data),
  update: (id: string, data: Omit<Task, 'id' | 'createdAt'>) => http.put<void>(`/tasks/${id}`, data),
  delete: (id: string) => http.delete<void>(`/tasks/${id}`),
}

export const groupsApi = {
  getAll: (organizationId: string) => http.get<Group[]>(`/groups${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<Group, 'id' | 'createdAt'>) =>
    http.post<Group>(`/groups${qs({ organizationId })}`, data),
  update: (id: string, data: Omit<Group, 'id' | 'createdAt'>) => http.put<void>(`/groups/${id}`, data),
  delete: (id: string) => http.delete<void>(`/groups/${id}`),
}

export const warrantyApi = {
  getAll: (organizationId: string) => http.get<WarrantyItem[]>(`/warranties${qs({ organizationId })}`),
  create: (organizationId: string, data: Omit<WarrantyItem, 'status'>) =>
    http.post<WarrantyItem>(`/warranties${qs({ organizationId })}`, data),
  update: (id: string, data: Omit<WarrantyItem, 'id' | 'status'>) => http.put<void>(`/warranties/${id}`, data),
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
    http.get<FileFolder[]>(`/files/folders${qs({ organizationId, parentFolderId })}`),
  createFolder: (organizationId: string, name: string, parentFolderId?: string) =>
    http.post<FileFolder>(`/files/folders${qs({ organizationId })}`, { name, parentFolderId }),
  deleteFolder: (id: string) => http.delete<void>(`/files/folders/${id}`),

  getFiles: (organizationId: string, folderId?: string) =>
    http.get<StoredFile[]>(`/files${qs({ organizationId, folderId })}`),
  upload: (organizationId: string, file: File, folderId?: string) =>
    http.upload<StoredFile>(`/files/upload${qs({ organizationId, folderId })}`, file),
  deleteFile: (id: string) => http.delete<void>(`/files/${id}`),
  getContentBlob: (id: string) => http.getBlob(`/files/${id}/content`),
  downloadFile: (id: string) => http.getBlob(`/files/${id}/download`),
}