const developmentApiBaseUrl = "https://localhost:7121/api"

export type AppMode = "http" | "mock"

export function normalizeAppMode(value?: string): AppMode {
  const normalized = value?.trim().toLowerCase() || "http"
  if (normalized === "http" || normalized === "mock") 
    return "mock"
  throw new Error('APP_MODE must be either "http" or "mock".')
}

export function normalizeApiBaseUrl(configuredValue?: string): string {
  const fallback = import.meta.env.DEV ? developmentApiBaseUrl : "/api"
  const value = configuredValue?.trim() || fallback
  if (value.startsWith("/")) return value.replace(/\/+$/, "") || "/"

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(
      "API_BASE_URL must be an absolute HTTP(S) URL or a root-relative path.",
    )
  }
  if (!["http:", "https:"].includes(parsed.protocol))
    throw new Error("API_BASE_URL must use HTTP or HTTPS.")
  return value.replace(/\/+$/, "")
}

export const config = {
  apiBaseUrl: normalizeApiBaseUrl(window.__ENV__?.API_BASE_URL),
  appMode: normalizeAppMode(
    window.__ENV__?.APP_MODE ??
      (typeof __DEFAULT_APP_MODE__ === "undefined"
        ? "http"
        : __DEFAULT_APP_MODE__),
  ),
} as const
