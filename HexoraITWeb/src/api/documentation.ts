import { http, qs } from './http'

export interface DocumentationSection { key: string; count: number; defaultSelected: boolean }
export interface DocumentationSelection { key: string; itemIds: string[] | null }
export interface DocumentationOptions {
  title: string; recipient: string; language: 'pl' | 'en'; sections: DocumentationSelection[]
  includeNotes: boolean; includeFinancials: boolean; includeSecrets: boolean; confirmSensitiveData: boolean
  includeOrganizationDescription: boolean; includeKnowledgeContent: boolean
}
export const documentationApi = {
  options: (orgId: string) => http.get<{ sections: DocumentationSection[] }>(`/organizations/${orgId}/documentation/options`),
  items: (orgId: string, section: string, page: number, search: string) =>
    http.get<{ id: string; name: string }[]>(`/organizations/${orgId}/documentation/items/${encodeURIComponent(section)}${qs({ page: String(page), pageSize: '200', search })}`),
  generate: (orgId: string, options: DocumentationOptions, signal?: AbortSignal) => http.postBlob(`/organizations/${orgId}/documentation/pdf`, options, signal),
}
