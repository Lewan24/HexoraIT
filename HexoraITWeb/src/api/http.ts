import { config } from "../../config"
import { ApiError } from "./errors"

export { ApiError } from "./errors"

const BASE_URL = config.apiBaseUrl
const PAGINATION_PAGE_SIZE = 200
const MAX_AUTOMATIC_PAGES = 100

const AUTH_TOKEN_KEY = "auth_token"
let memoryToken: string | null = null

export const authTokenStorage = {
  get(): string | null {
    try {
      const stored = localStorage.getItem(AUTH_TOKEN_KEY)
      memoryToken = stored
      return stored
    } catch {
      return memoryToken
    }
  },
  set(token: string) {
    memoryToken = token
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, token)
    } catch {
      /* Keep the session in memory. */
    }
  },
  clear() {
    memoryToken = null
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY)
    } catch {
      /* Storage may be disabled. */
    }
  },
}

type UnauthorizedHandler = () => void
let onUnauthorized: UnauthorizedHandler | null = null
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler
}

type ProblemBody = {
  title?: string
  detail?: string
  message?: string
  errors?: Record<string, string[] | string>
}

function problemMessage(
  status: number,
  body: unknown,
  fallback: string,
): string {
  if (typeof body === "string" && body.trim()) return body
  if (body && typeof body === "object") {
    const problem = body as ProblemBody
    if (problem.message?.trim()) return problem.message
    if (problem.detail?.trim()) return problem.detail
    const validationMessage = Object.values(problem.errors ?? {})
      .flat()
      .find((value) => typeof value === "string" && value.trim())
    if (validationMessage) return validationMessage
    if (problem.title?.trim()) return problem.title
  }
  if (status === 429) return "Too many requests. Please wait and try again."
  return fallback || `Request failed with status ${status}.`
}

async function readErrorBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

async function checkedFetch(
  path: string,
  options: RequestInit,
): Promise<Response> {
  const token = authTokenStorage.get()
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body !== undefined && !(options.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch (error) {
    throw new ApiError(0, "Unable to connect to the server.", error)
  }

  if (response.ok) return response
  const details = await readErrorBody(response)
  if (response.status === 401 && token) {
    onUnauthorized?.()
    throw new ApiError(401, "Session expired. Please log in again.", details)
  }
  if (response.status === 403 && !path.endsWith("/permissions")) {
    window.dispatchEvent(new Event("organization-access-changed"))
  }
  throw new ApiError(
    response.status,
    problemMessage(response.status, details, response.statusText),
    details,
  )
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  getString: boolean = false,
): Promise<T> {
  if (config.appMode === "mock") {
    const { mockApi } = await import("./mockApi")
    return mockApi.request<T>(
      options.method ?? "GET",
      path,
      options.body,
      getString ? "text" : "json",
    )
  }
  const res = await checkedFetch(path, options)

  if (res.status === 204 || res.status === 205) return undefined as T

  if (!getString) return res.json() as Promise<T>

  return res.text() as Promise<T>
}

async function getAllPages<T>(path: string): Promise<T[]> {
  if (config.appMode === "mock") return request<T[]>(path)
  const results: T[] = []
  const separator = path.includes("?") ? "&" : "?"

  for (let page = 1; page <= MAX_AUTOMATIC_PAGES; page += 1) {
    const batch = await request<T[]>(
      `${path}${separator}page=${page}&pageSize=${PAGINATION_PAGE_SIZE}`,
    )
    results.push(...batch)
    if (batch.length < PAGINATION_PAGE_SIZE) return results
  }

  throw new ApiError(
    0,
    "The result set exceeds the safe client-side pagination limit.",
  )
}

export function qs(params: Record<string, string | undefined | null>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null,
  ) as [string, string][]

  if (entries.length === 0) return ""

  return "?" + new URLSearchParams(entries).toString()
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  getAllPages,
  getString: (path: string) => request<string>(path, {}, true),
  getBlob: async (path: string): Promise<Blob> => {
    if (config.appMode === "mock") {
      const { mockApi } = await import("./mockApi")
      return mockApi.request<Blob>("GET", path, undefined, "blob")
    }
    const res = await checkedFetch(path, {})
    return res.blob()
  },

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),

  upload: async <T>(path: string, file: File) => {
    if (config.appMode === "mock") {
      const { mockApi } = await import("./mockApi")
      return mockApi.upload<T>(path, file)
    }
    const form = new FormData()

    form.append("file", file)

    return request<T>(path, {
      method: "POST",
      body: form,
    })
  },
}
