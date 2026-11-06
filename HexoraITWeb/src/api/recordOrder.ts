import { http, qs } from './http'
import type { RecordOrderChange } from '../lib/recordOrder'

export interface RecordOrderItem { id: string; name: string; sortIndex: number | null; canWrite: boolean }
export const recordOrderApi = {
  get: (orgId: string, resource: string, page: number, search: string, parentId?: string) =>
    http.get<RecordOrderItem[]>(`/organizations/${orgId}/record-order/${resource}${qs({ page: String(page), pageSize: '200', search, parentId })}`),
  save: (orgId: string, resource: string, changes: RecordOrderChange[]) => http.patch<RecordOrderChange[]>(`/organizations/${orgId}/record-order/${resource}`, { changes }),
}
