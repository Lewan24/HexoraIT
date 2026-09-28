import { defineConfig } from "vite"

import react from "@vitejs/plugin-react"

import tailwindcss from "@tailwindcss/vite"

import path from "node:path"

export default defineConfig(({ mode }) => {
  const appMode =
    process.env.APP_MODE === "mock" || mode === "demo"
      ? "mock"
      : "http"

  console.log("================================")
  console.log("VITE BUILD MODE:", mode)
  console.log("APP_MODE ENV:", process.env.APP_MODE)
  console.log("FINAL APP MODE:", appMode)
  console.log("================================")

  return {
    define: {
      __DEFAULT_APP_MODE__: JSON.stringify(appMode),
    },
    plugins: [
      react(),

      tailwindcss(),
    ],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },

    build: {
      // ExcelJS is loaded only when an XLSX preview is opened. Its minified
      // distribution is intentionally kept in a separate, on-demand chunk.
      chunkSizeWarningLimit: 1000,
    },

    server: {
      host: process.env.HOST ?? "127.0.0.1",
      port: Number(process.env.PORT ?? 8443),
    },

    preview: {
      host: process.env.HOST ?? "127.0.0.1",
      port: Number(process.env.PORT ?? 8443),
    },
  }
})