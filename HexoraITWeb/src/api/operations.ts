import { http } from "./http"
import type { OperationSchema, OperationValues } from "../lib/operationForm"

export interface OperationTemplate {
  id: string
  key: string
  version: number
  schemaJson: string
  contentHash: string
}
export interface OperationRecord {
  id: string
  number: string
  templateVersionId: string
  title: string
  description: string
  status: string
  risk: string
  priority: string
  changeType: string
  requesterId: string
  implementerId: string
  ownerId: string
  assetId: string | null
  plannedStart: string | null
  plannedEnd: string | null
  actualStart: string | null
  actualEnd: string | null
  revisionToken: string
  createdAt: string
  modifiedAt: string
  valuesJson: string
}
export interface OperationActivity {
  id: string
  actorId: string
  occurredAt: string
  eventType: string
  fromStatus: string
  toStatus: string
}
export interface OperationRevision {
  id: string
  actorId: string
  createdAt: string
  revisionToken: string
}
export interface OperationDetail {
  record: OperationRecord
  template: OperationTemplate
  schema: OperationSchema
  values: OperationValues
  activity: OperationActivity[]
  revisions: OperationRevision[]
  allowedTransitions: string[]
  canEdit: boolean
}
export interface OperationList {
  items: OperationRecord[]
  total: number
  page: number
  pageSize: number
}
export interface OperationInput {
  templateVersionId: string
  title: string
  description: string
  values: OperationValues
  risk: string
  priority: string
  changeType: string
  assetId: string | null
  plannedStart: string | null
  plannedEnd: string | null
  revisionToken?: string
  implementerId?: string
  ownerId?: string
  actualStart?: string | null
  actualEnd?: string | null
}
const base = (org: string) => `/operations/${encodeURIComponent(org)}`
export const operationsApi = {
  templates: (org: string) =>
    http.get<OperationTemplate[]>(`${base(org)}/templates`),
  list: (org: string, filters: Record<string, string>) =>
    http.get<OperationList>(
      `${base(org)}/records?${new URLSearchParams(filters)}`,
    ),
  detail: (org: string, id: string) =>
    http.get<OperationDetail>(`${base(org)}/records/${id}`),
  create: (org: string, body: OperationInput) =>
    http.post<{ id: string }>(`${base(org)}/records`, body),
  save: (org: string, id: string, body: OperationInput) =>
    http.put(`${base(org)}/records/${id}`, body),
  transition: (
    org: string,
    id: string,
    revisionToken: string,
    target: string,
    reason: string,
  ) =>
    http.post(`${base(org)}/records/${id}/transitions`, {
      revisionToken,
      target,
      reason,
    }),
  revision: (org: string, id: string, revision: string) =>
    http.get<{ snapshotJson: string }>(
      `${base(org)}/records/${id}/revisions/${revision}`,
    ),
  pdf: (org: string, id: string, language: string) =>
    http.getBlob(`${base(org)}/records/${id}/pdf?language=${language}`),
}
