import { tr, useLocale } from '../i18n'
import { useState, useEffect } from 'react'
import { Shield, Loader2, Ban, KeyRound, ShieldCheck, Plus } from 'lucide-react'
import { adminApi } from '../api/resources'
import type { AdminUser, SystemRole } from '../api/types'
import { useAuth } from '../context/useAuth'
import { ApiError } from '../api/http'

export default function AdminPanel() {
  useLocale()
    const { user: currentUser } = useAuth()
    const [users, setUsers] = useState<AdminUser[] | null>(null)
    const [busyUserId, setBusyUserId] = useState<string | null>(null)
    const [resetTarget, setResetTarget] = useState<AdminUser | null>(null)
    const [newPassword, setNewPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [createOpen, setCreateOpen] = useState(false)

    const [createForm, setCreateForm] = useState({
        email: '',
        displayName: '',
        password: '',
        systemRole: 'User' as SystemRole
    })

    useEffect(() => {
        adminApi.getUsers().then(setUsers)
    }, [])

    const submitCreate = async () => {
        if (
            createForm.email === '' ||
            createForm.displayName === '' ||
            createForm.password.length < 8
        )
            return

        setBusyUserId("creating")
        setError(null)

        try {
            const created = await adminApi.createUser(
                createForm.email,
                createForm.displayName,
                createForm.password,
                createForm.systemRole
            )

            setUsers(prev =>
                [...(prev ?? []), created].sort((a, b) =>
                    a.email.localeCompare(b.email)
                )
            )

            setCreateOpen(false)

            setCreateForm({
                email: '',
                displayName: '',
                password: '',
                systemRole: 'User'
            })
        } catch (err) {
            setError(err instanceof ApiError ? err.message : tr("Failed to create user"))
        } finally {
            setBusyUserId(null)
        }
    }

    const toggleBlocked = async (u: AdminUser) => {
        setBusyUserId(u.id)
        setError(null)
        try {
            await adminApi.setBlocked(u.id, !u.isBlocked)
            setUsers(prev => prev?.map(x => x.id === u.id ? { ...x, isBlocked: !x.isBlocked } : x) ?? null)
        } catch (err) {
            setError(err instanceof ApiError ? err.message : tr("Failed to update user"))
        } finally {
            setBusyUserId(null)
        }
    }

    const changeRole = async (u: AdminUser, role: SystemRole) => {
        setBusyUserId(u.id)
        setError(null)
        try {
            await adminApi.setRole(u.id, role)
            setUsers(prev => prev?.map(x => x.id === u.id ? { ...x, systemRole: role } : x) ?? null)
        } catch (err) {
            setError(err instanceof ApiError ? err.message : tr("Failed to update role"))
        } finally {
            setBusyUserId(null)
        }
    }

    const submitReset = async () => {
        if (!resetTarget || newPassword.length < 8) return
        setBusyUserId(resetTarget.id)
        setError(null)
        try {
            await adminApi.resetPassword(resetTarget.id, newPassword)
            setResetTarget(null)
            setNewPassword('')
        } catch (err) {
            setError(err instanceof ApiError ? err.message : tr("Failed to reset password"))
        } finally {
            setBusyUserId(null)
        }
    }

    if (!users) {
        return <div className="p-6 flex items-center justify-center h-64"><Loader2 size={20} className="animate-spin text-ink-muted" /></div>
    }

    return (
        <div className="p-4 sm:p-6 max-w-[900px] space-y-4">
            <div>
                <h1 className="text-xl font-semibold text-ink-primary flex items-center gap-2"><ShieldCheck size={18} className="text-blue-400" />  {tr("Administration")}</h1>
                <p className="text-xs text-ink-muted mt-0.5">{tr("User management")}</p>
            </div>

            <div className="bg-navy-800 border border-edge-subtle rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-edge-subtle flex flex-row justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-ink-primary">{tr("Users")}</h3>
                        <p className="text-[11px] text-ink-muted mt-0.5">{users.length}  {tr("accounts")}</p>
                    </div>

                    <div>
                        <button
                            onClick={() => setCreateOpen(true)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500 hover:bg-green-400 text-white text-xs font-medium transition-colors"
                        >
                            <Plus size={14} />
                             {tr("Add User")} </button>
                    </div>
                </div>
                
                {error && <p className="px-5 pt-3 text-xs text-red-400">{error}</p>}
                <div className="divide-y divide-edge-subtle">
                    {users.map(u => {
                        const isSelf = u.id === currentUser?.id
                        const busy = busyUserId === u.id
                        return (
                            <div key={u.id} className="flex items-center gap-3 px-5 py-3 flex-wrap">
                                <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                    {u.displayName.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-ink-primary truncate">{u.displayName}{isSelf ? tr(" (you)") : ''}</p>
                                    <p className="text-[10px] text-ink-muted truncate">{u.email}</p>
                                </div>
                                <select value={u.systemRole} disabled={isSelf || busy}
                                    onChange={e => changeRole(u, e.target.value as SystemRole)}
                                    className="px-2 py-1 rounded-lg bg-navy-700 border border-edge-default text-ink-primary text-[11px] disabled:opacity-50">
                                    <option value="User">{tr("User")}</option>
                                    <option value="Admin">{tr("Admin")}</option>
                                </select>
                                {u.isBlocked && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 flex-shrink-0">{tr("Blocked")}</span>}
                                <button onClick={() => setResetTarget(u)} disabled={busy}
                                    className="p-1.5 rounded-md text-ink-muted hover:text-blue-400 hover:bg-navy-700 transition-colors disabled:opacity-40" title={tr("Reset password")}>
                                    <KeyRound size={13} />
                                </button>
                                <button onClick={() => toggleBlocked(u)} disabled={isSelf || busy}
                                    className={`p-1.5 rounded-md transition-colors disabled:opacity-40 ${u.isBlocked ? 'text-green-400 hover:bg-navy-700' : 'text-ink-muted hover:text-red-400 hover:bg-navy-700'}`}
                                    title={u.isBlocked ? tr("Unblock") : tr("Block")}>
                                    {busy ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>

            {resetTarget && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={() => setResetTarget(null)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-sm font-semibold text-ink-primary mb-1 flex items-center gap-2"><Shield size={14} />  {tr("Reset Password")}</h3>
                        <p className="text-xs text-ink-muted mb-4">{tr("Set a new password for")} {resetTarget.email}{tr(". They'll need to use it on their next sign-in.")}</p>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={tr("At least 8 characters")}
                            className="w-full px-3 py-2 rounded-lg bg-navy-700 border border-edge-default text-ink-primary text-sm placeholder:text-ink-muted focus:outline-none focus:border-blue-500 mb-4" />
                        <div className="flex gap-2">
                            <button onClick={() => setResetTarget(null)} className="flex-1 py-2 rounded-lg bg-navy-700 hover:bg-navy-600 text-ink-secondary text-xs border border-edge-default transition-colors">{tr("Cancel")}</button>
                            <button onClick={submitReset} disabled={newPassword.length < 8 || busyUserId === resetTarget.id}
                                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition-colors disabled:opacity-50">
                                {busyUserId === resetTarget.id ? tr("Saving…") : tr("Set Password")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {createOpen && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center p-4"
                    onClick={() => setCreateOpen(false)}
                >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                    <div
                        className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-md p-6"
                        onClick={e => e.stopPropagation()}
                    >

                        <h3 className="text-sm font-semibold text-ink-primary mb-5 flex items-center gap-2">
                            <Plus size={14} />
                             {tr("Create User")} </h3>

                        <div className="space-y-3">

                            <input
                                placeholder={tr("Display name")}
                                value={createForm.displayName}
                                onChange={e =>
                                    setCreateForm(f => ({
                                        ...f,
                                        displayName: e.target.value
                                    }))
                                }
                                className="w-full px-3 py-2 rounded-lg bg-navy-700 border border-edge-default"
                            />

                            <input
                                placeholder={tr("Email")}
                                type="email"
                                value={createForm.email}
                                onChange={e =>
                                    setCreateForm(f => ({
                                        ...f,
                                        email: e.target.value
                                    }))
                                }
                                className="w-full px-3 py-2 rounded-lg bg-navy-700 border border-edge-default"
                            />

                            <input
                                placeholder={tr("Password")}
                                type="password"
                                value={createForm.password}
                                onChange={e =>
                                    setCreateForm(f => ({
                                        ...f,
                                        password: e.target.value
                                    }))
                                }
                                className="w-full px-3 py-2 rounded-lg bg-navy-700 border border-edge-default"
                            />

                            <select
                                value={createForm.systemRole}
                                onChange={e =>
                                    setCreateForm(f => ({
                                        ...f,
                                        systemRole: e.target.value as SystemRole
                                    }))
                                }
                                className="w-full px-3 py-2 rounded-lg bg-navy-700 border border-edge-default"
                            >
                                <option value="User">{tr("User")}</option>
                                <option value="Admin">{tr("Admin")}</option>
                            </select>

                        </div>

                        <div className="flex gap-2 mt-5">

                            <button
                                onClick={() => setCreateOpen(false)}
                                className="flex-1 py-2 rounded-lg bg-navy-700 hover:bg-navy-600 border border-edge-default"
                            >
                                 {tr("Cancel")} </button>

                            <button
                                onClick={submitCreate}
                                disabled={
                                    !createForm.email ||
                                    !createForm.displayName ||
                                    createForm.password.length < 8
                                }
                                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white disabled:opacity-50"
                            >
                                 {tr("Create")} </button>

                        </div>

                    </div>
                </div>
            )}
        </div>
    )
}