import { http } from './http'

export type AuditStatus = 'planned' | 'in-progress' | 'completed'
export interface OrganizationAudit {
  id: string
  title: string
  auditDate: string
  status: AuditStatus
}
export interface AuditAttachment { id: string; fileName: string; size: number }
export interface AuditUpdate {
  id: string
  author: string
  createdAt: string
  status: AuditStatus
  note: string
  attachments: AuditAttachment[]
}
interface Page<T> { items: T[]; more: boolean }

const path = (orgId: string) => `/organizations/${orgId}/audit-history`
export const organizationAuditsApi = {
  list: (orgId: string, page: number) => http.get<Page<OrganizationAudit>>(`${path(orgId)}?page=${page}`),
  updates: (orgId: string, id: string, page: number) => http.get<Page<AuditUpdate>>(`${path(orgId)}/${id}/updates?page=${page}`),
  append: (orgId: string, id: string, updateId: string, form: FormData) =>
    http.postForm<void>(`${path(orgId)}/${id}/updates/${updateId}`, form),
  download: (orgId: string, id: string, attachmentId: string) =>
    http.getBlob(`${path(orgId)}/${id}/attachments/${attachmentId}`),
}
