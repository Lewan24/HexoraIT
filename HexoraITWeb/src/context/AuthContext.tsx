import { createContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { authApi, type UserDto } from '../api/auth'
import { authTokenStorage, setUnauthorizedHandler } from '../api/http'
import type { OrganizationSummary } from '../api/types'

interface AuthContextValue {
  user: UserDto | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => void
  updateProfile: (displayName: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null)
  const [isLoading, setIsLoading] = useState(() => Boolean(authTokenStorage.get()))

  const logout = useCallback(() => {
    authTokenStorage.clear()
    setUser(null)
  }, [])

  // Global 401 handler — any API call anywhere in the app that comes back
  // unauthorized drops the session, no matter which component triggered it.
  useEffect(() => {
    setUnauthorizedHandler(() => logout())
    return () => setUnauthorizedHandler(null)
  }, [logout])

  useEffect(() => {
    const synchronizeLogout = (event: StorageEvent) => {
      if (event.key === 'auth_token' && event.newValue === null) setUser(null)
    }
    window.addEventListener('storage', synchronizeLogout)
    return () => window.removeEventListener('storage', synchronizeLogout)
  }, [])

  // On mount, if a token is already stored, validate it against /auth/me
  // rather than trusting it blindly (it may have expired since last visit).
  useEffect(() => {
    const token = authTokenStorage.get()

    if (!token) {
      return
    }

    authApi.me()
      .then(setUser)
      .catch(() => authTokenStorage.clear())
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    authTokenStorage.set(res.token)
    setUser(res.user)
  }, [])

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const res = await authApi.register(email, password, displayName)
    authTokenStorage.set(res.token)
    setUser(res.user)
  }, [])

  const updateProfile = useCallback(async (displayName: string) => {
    await authApi.updateProfile(displayName)
    setUser(u => u ? { ...u, displayName } : u)
  }, [])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await authApi.changePassword(currentPassword, newPassword)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, updateProfile, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

// Re-exported for AppProvider's org list, since organizations now come
// from GET /api/organizations rather than the login response.
export { AuthContext }
export type { OrganizationSummary }
