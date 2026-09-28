import LanguageSwitcher from "./LanguageSwitcher"

import { tr, useLocale } from "../i18n"

import { useState, type FormEvent } from "react"

import { Eye, EyeOff, Moon, Sun } from "lucide-react"

import { useAuth } from "../context/useAuth"

import { ApiError } from "../api/http"

import logo from "../../public/logo/HexoraIT_Logo.png"

import logoDark from "../../public/logo/HexoraIT_LogoNoBg.png"

import { getTheme, toggleTheme } from "../lib/theme"
import { config } from "../../config"
import { DEMO_ACCOUNTS } from "../demo"

export default function Login() {
  useLocale()

  const { login } = useAuth()

  const [email, setEmail] = useState("")

  const [password, setPassword] = useState("")

  const [showPass, setShowPass] = useState(false)

  const [loading, setLoading] = useState(false)

  const [focused, setFocused] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)

  const [theme, setThemeState] = useState(getTheme)
  const isDemo = config.appMode === "mock"

  const fillDemoAccount = (
    account: typeof DEMO_ACCOUNTS[keyof typeof DEMO_ACCOUNTS],
  ) => {
    setEmail(account.email)
    setPassword(account.password)
    setError(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    setError(null)

    setLoading(true)

    try {
      await login(email, password)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : tr("Unable to sign in. Please try again."),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page min-h-screen flex items-center justify-center bg-navy-950 relative overflow-hidden p-5">
      {/* Dot-grid background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--_edge-default, #252525) 1px, transparent 1px)",

          backgroundSize: "80px 80px",

          opacity: 0.8,
        }}
      />
      {/* Subtle vignette */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at top, color-mix(in srgb, var(--_blue-500) 12%, transparent), transparent 65%)" }}
      />

      <div className="relative z-10 w-full max-w-[440px] rounded-3xl border border-edge-default bg-navy-800 p-7 sm:p-9 shadow-2xl shadow-black/5">
        <div className="flex items-center justify-between mb-6">
          <LanguageSwitcher />
          <button
            onClick={() => {
              const t = toggleTheme()
              setThemeState(t)
            }}
            className="size-9 rounded-lg flex items-center justify-center text-ink-secondary hover:text-ink-primary hover:bg-navy-700 transition-colors flex-shrink-0"
            title={
              theme === "dark"
                ? tr("Switch to light mode")
                : tr("Switch to dark mode")
            }
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div>
            {getTheme() === "dark" && <img src={logoDark} alt="HexoraIT" className="w-52 sm:w-60 max-w-full mx-auto mb-7" />}

            {getTheme() === "light" && <img src={logo} alt="HexoraIT" className="w-52 sm:w-60 max-w-full mx-auto mb-7" />}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-primary leading-tight">
            {tr("Sign in to HexoraIT")}{" "}

          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {tr("Your IT documentation workspace")}
          </p>
          {isDemo && (
            <p className="mt-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-300">
              {tr("Demo mode: all changes are stored only in this browser.")}
            </p>
          )}
        </div>

        {isDemo && (
          <div className="mb-4 grid grid-cols-2 gap-2">
            {Object.values(DEMO_ACCOUNTS).map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemoAccount(account)}
                className="rounded-lg border border-edge-default bg-navy-800 px-3 py-2 text-left hover:border-blue-500/50 hover:bg-navy-700"
              >
                <span className="block text-xs font-medium text-ink-primary">
                  {tr(account.label)}
                </span>
                <span className="block truncate text-[10px] text-ink-muted">
                  {account.email}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="login-email" className="block text-xs font-medium text-ink-secondary mb-1.5">
              {tr("Email")}{" "}
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              placeholder={tr("you@corp.local")}
              autoComplete="email"
              required
              maxLength={256}
              className="w-full px-3 py-2.5 rounded-xl bg-navy-800 border text-ink-primary text-sm placeholder:text-ink-muted focus:outline-none transition-colors"
              style={{
                borderColor:
                  focused === "email"
                    ? "var(--_blue-500)"
                    : "var(--_edge-default)",
              }}
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-medium text-ink-secondary mb-1.5">
              {tr("Password")}{" "}
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused("pass")}
                onBlur={() => setFocused(null)}
                placeholder={"••••••••••••"}
                autoComplete="current-password"
                required
                minLength={8}
                maxLength={200}
                className="w-full px-3 py-2.5 pr-10 rounded-xl bg-navy-800 border text-ink-primary text-sm placeholder:text-ink-muted focus:outline-none transition-colors"
                style={{
                  borderColor:
                    focused === "pass"
                      ? "var(--_blue-500)"
                      : "var(--_edge-default)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                aria-label={tr(showPass ? "Hide password" : "Show password")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-secondary transition-colors"
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 font-mono pt-0.5">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {tr("Authenticating…")}
              </span>
            ) : (
              tr("Sign in")
            )}
          </button>
        </form>

        <div className="text-center mt-5">
          <p className="text-xs">
            {tr(
              "For a new account or a forgotten password, contact the application administrator.",
            )}
          </p>
        </div>


      </div>
    </div>
  )
}
