/// <reference types="vite/client" />
declare global {
  const __DEFAULT_APP_MODE__: "http" | "mock"
  interface Window {
    __ENV__?: {
      API_BASE_URL?: string
      APP_MODE?: "http" | "mock"
    }
  }
}

export {}
