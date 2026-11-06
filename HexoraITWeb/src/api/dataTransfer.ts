import { http } from './http'

export interface ArchiveCapabilities {
  canExport: boolean
  canImport: boolean
  isEmpty: boolean
  maxArchiveBytes: number
  maxFileBytes: number
  maxExpandedBytes: number
}
export interface ArchivePreview {
  organizationName: string
  createdAt: string
  counts: Record<string, number>
  fileCount: number
  fileBytes: number
  reviewToken: string
}
export interface ArchiveExportOptions {
  sections: { key: string; count: number }[]
  files: { id: string; name: string; size: number }[]
}
export interface ArchiveExportSelection {
  sections: string[]
  fileIds: string[] | null
  includeAttachments: boolean
}
const path = (org: string) => `/organizations/${org}/data-transfer`
export const dataTransferApi = {
  capabilities: (org: string) => http.get<ArchiveCapabilities>(path(org) + '/capabilities'),
  options: (org: string) => http.get<ArchiveExportOptions>(path(org) + '/options'),
  export: async (org: string, password: string, archivePassword: string, selection: ArchiveExportSelection, signal?: AbortSignal) => {
    const response = await http.post<{ downloadToken: string }>(path(org) + '/export-download',
      { password, archivePassword, confirmSensitiveData: true, ...selection }, signal)
    return http.resolveUrl(`/data-transfer/download?ticket=${encodeURIComponent(response.downloadToken)}`)
  },
  preview: (org: string, file: File, archivePassword: string, signal?: AbortSignal) => {
    const form = new FormData()
    form.append('file', file)
    form.append('archivePassword', archivePassword)
    return http.postForm<ArchivePreview>(path(org) + '/preview', form, signal)
  },
  import: (org: string, file: File, reviewToken: string, password: string, confirmOrganizationName: string, archivePassword: string, signal?: AbortSignal) => {
    const form = new FormData()
    form.append('file', file)
    form.append('archivePassword', archivePassword)
    form.append('reviewToken', reviewToken)
    form.append('password', password)
    form.append('confirmOrganizationName', confirmOrganizationName)
    form.append('confirmImport', 'true')
    return http.postForm<{ importedRecords: number; importedFiles: number }>(path(org) + '/import', form, signal)
  },
}
