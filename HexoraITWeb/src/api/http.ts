import { config } from "../../config"

const BASE_URL = config.apiBaseUrl

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

function getToken(): string | null {
  return localStorage.getItem('auth_token')
}

type UnauthorizedHandler = () => void
let onUnauthorized: UnauthorizedHandler | null = null
export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  onUnauthorized = handler
}

async function request<T>(path: string, options: RequestInit = {}, getString: boolean = false): Promise<T> {
  const isFormData = options.body instanceof FormData

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    onUnauthorized?.()
    throw new ApiError(401, 'Session expired. Please log in again.')
  }

  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json()
      message = body.title ?? body.message ?? (typeof body === 'string' ? body : message)
    } catch {
      /* no JSON body */
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) 
    return undefined as T

  if (!getString)
    return res.json() as Promise<T>

  return res.text() as Promise<T>
}

export function qs(params: Record<string, string | undefined | null>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null) as [string, string][]
  if (entries.length === 0) return ''
  return '?' + new URLSearchParams(entries).toString()
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  getString: (path: string) => request<string>(path, {}, true),
  getBlob: async (path: string): Promise<Blob> => {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    })
    if (res.status === 401) { onUnauthorized?.(); throw new ApiError(401, 'Session expired.') }
    if (!res.ok) throw new ApiError(res.status, res.statusText)
    return res.blob()
  },
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<T>(path, {
      method: 'POST',
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      body: form,
    })
  },
}