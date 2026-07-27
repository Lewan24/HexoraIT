import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, Moon, Sun } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { ApiError } from '../api/http'
import logo from '../../public/logo/HexoraIT_Logo.png'
import logoDark from '../../public/logo/HexoraIT_LogoNoBg.png'
import { getTheme, toggleTheme } from '../lib/theme'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [theme, setThemeState] = useState(getTheme)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 relative overflow-hidden select-none">

      {/* Dot-grid background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--_edge-default, #252525) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          opacity: 0.8,
        }}
      />
      {/* Subtle vignette */}
      <div className="absolute inset-0" style={{ background: 'var(--_bg-white)' }} />

      <div className="relative z-10 w-full max-w-[380px] px-5">

        <div className='flex flex-col items-center'>
          <button
            onClick={() => { const t = toggleTheme(); setThemeState(t) }}
            className="size-12 rounded-lg flex items-center justify-center text-ink-secondary hover:text-ink-primary hover:bg-navy-700 transition-colors flex-shrink-0"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div>
            {(getTheme() === 'dark') && (
              <img src={logoDark}/>
            )}

            {(getTheme() === 'light') && (
              <img src={logo}/>
            )}
          </div>
          <h1 className="text-xl font-semibold text-ink-primary leading-tight">
            Sign in to HexoraIT
            <span className="cursor-blink ml-0.5 text-blue-400">_</span>
          </h1>
          <p className="text-sm text-ink-muted mt-1">Your IT documentation workspace</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              placeholder="you@corp.local"
              autoComplete="email"
              required
              className="w-full px-3 py-2.5 rounded-md bg-navy-800 border text-ink-primary text-sm placeholder:text-ink-muted focus:outline-none transition-colors font-mono"
              style={{ borderColor: focused === 'email' ? 'var(--_blue-500)' : 'var(--_edge-default)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocused('pass')}
                onBlur={() => setFocused(null)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
                minLength={8}
                className="w-full px-3 py-2.5 pr-10 rounded-md bg-navy-800 border text-ink-primary text-sm placeholder:text-ink-muted focus:outline-none transition-colors font-mono"
                style={{ borderColor: focused === 'pass' ? 'var(--_blue-500)' : 'var(--_edge-default)' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
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
            className="w-full py-2.5 rounded-md bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1 font-mono"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                authenticating...
              </span>
            ) : '→ sign_in()'}
          </button>
        </form>

        <div className='text-center mt-5'>
          <p className='text-xs'>If you need an <b>Account</b> or <b>forgot</b> the password <br/> Contact with the application <b>Administrator</b></p>
        </div>

        {/* Footer */}
        <div className="mt-1 pt-5 border-t border-edge-subtle flex items-center justify-between">
          <span className="text-[11px] font-mono text-ink-muted">v1.0.0 · self-hosted</span>
          <span className="text-[11px] font-mono text-ink-muted">corp.local</span>
        </div>

      </div>
    </div>
  )
}