const developmentApiBaseUrl = 'https://localhost:7121/api'

export function normalizeApiBaseUrl(configuredValue?: string): string {
  const fallback = import.meta.env.DEV ? developmentApiBaseUrl : '/api'
  const value = configuredValue?.trim() || fallback
  if (value.startsWith('/')) return value.replace(/\/+$/, '') || '/'

  let parsed: URL
  try { parsed = new URL(value) } catch { throw new Error('API_BASE_URL must be an absolute HTTP(S) URL or a root-relative path.') }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('API_BASE_URL must use HTTP or HTTPS.')
  return value.replace(/\/+$/, '')
}

export const config = {
  apiBaseUrl: normalizeApiBaseUrl(window.__ENV__?.API_BASE_URL),
} as const
