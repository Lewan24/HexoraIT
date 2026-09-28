import { http, qs } from './http'
import { config } from '../../config'

export interface AuditEvent {
  id: string; occurredAt: string; eventType: string; severity: string; source: string
  userId?: string; targetUserId?: string; organizationId?: string; resourceId?: string
  account?: string; sessionId?: string; clientIp?: string; peerIp?: string
  method: string; path: string; route?: string; statusCode: number; durationMs: number
  traceId: string; userAgent?: string; redirectPath?: string; signal?: string
}
export interface AuditPage { items: AuditEvent[]; total: number; page: number; pageSize: number }
export interface AuditSummary {
  since: string; total: number; warnings: number; failures: number; errors: number
  denied: number; rateLimited: number; incidents: number; notFound: number
}
export const auditApi = {
  list: (filters: Record<string, string>) => config.appMode === 'mock'
    ? Promise.resolve<AuditPage>({ items: [], total: 0, page: Number(filters.page || 1), pageSize: 50 })
    : http.get<AuditPage>(`/admin/audit${qs(filters)}`),
  summary: () => config.appMode === 'mock'
    ? Promise.resolve<AuditSummary>({ since: new Date(Date.now() - 86400000).toISOString(), total: 0, warnings: 0, failures: 0, errors: 0, denied: 0, rateLimited: 0, incidents: 0, notFound: 0 })
    : http.get<AuditSummary>('/admin/audit/summary'),
  report: (eventType: 'navigation' | 'client_not_found' | 'security_probe', path: string) => {
    if (config.appMode === 'mock') return
    // Telemetry is best effort. Never include query strings, fragments or page contents.
    void http.post('/audit/client', { eventType, path: (path.split(/[?#]/)[0] ?? '/').slice(0, 2048) }).catch(() => {})
  },
}
