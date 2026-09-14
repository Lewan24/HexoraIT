import { useEffect, useState } from 'react'
import { rolesApi } from '../api/roles'
import { organizationsApi } from '../api/resources'
import { useApp } from '../context/useApp'
import { MODULE_ID, RESOURCES } from '../lib/permissions'
import type { OrganizationRole, OrgMember, OrgRole, ResourcePermission } from '../api/types'

const inputClass = 'w-full rounded-lg border border-edge-default bg-navy-700 px-3 py-2 text-sm text-ink-primary'
const buttonClass = 'rounded-lg border border-edge-default px-3 py-2 text-xs text-ink-primary hover:bg-navy-700 disabled:opacity-50'

function newRole(): OrganizationRole {
  return {
    id: '', name: '', permissions: RESOURCES.map(resource => ({
      resource, resourceId: MODULE_ID, canRead: false, canWrite: false,
    })),
  }
}

export default function OrganizationRoles() {
  const { currentOrg, access } = useApp()
  if (!currentOrg || !access?.canManageRoles) {
    return <p role="alert" className="p-5 text-ink-muted">Only organization owners and administrators can manage roles.</p>
  }
  return <RoleEditor key={currentOrg.id} orgId={currentOrg.id} orgName={currentOrg.name} owner={currentOrg.role === 'Owner'} />
}

function RoleEditor({ orgId, orgName, owner }: { orgId: string; orgName: string; owner: boolean }) {
  const { toast } = useApp()
  const [roles, setRoles] = useState<OrganizationRole[]>([])
  const [members, setMembers] = useState<OrgMember[]>([])
  const [draft, setDraft] = useState<OrganizationRole | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resource, setResource] = useState('assets')
  const [options, setOptions] = useState<{ id: string; name: string }[]>([])
  const [resourceId, setResourceId] = useState('')
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('ReadOnly')

  useEffect(() => {
    let cancelled = false
    Promise.all([rolesApi.list(orgId), organizationsApi.getMembers(orgId)])
      .then(([nextRoles, nextMembers]) => {
        if (!cancelled) { setRoles(nextRoles); setMembers(nextMembers) }
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load roles') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [orgId])

  useEffect(() => {
    let cancelled = false
    rolesApi.resources(orgId, resource)
      .then(items => { if (!cancelled) { setOptions(items); setResourceId('') } })
      .catch(() => { if (!cancelled) { setOptions([]); setError('Failed to load resource options') } })
    return () => { cancelled = true }
  }, [orgId, resource])

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await action()
      window.dispatchEvent(new Event('organization-access-changed'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed')
    } finally { setBusy(false) }
  }

  const save = () => run(async () => {
    if (!draft) return
    if (draft.id) await rolesApi.update(orgId, draft)
    else await rolesApi.create(orgId, draft)
    setRoles(await rolesApi.list(orgId))
    setDraft(null)
    toast('Organization role saved')
  })

  const setRule = (resource: string, id: string, field: 'canRead' | 'canWrite', checked: boolean) => {
    setDraft(previous => {
      if (!previous) return previous
      const existing = previous.permissions.find(p => p.resource === resource && p.resourceId === id)
      const rule: ResourcePermission = { resource, resourceId: id, canRead: false, canWrite: false, ...existing, [field]: checked }
      if (field === 'canRead' && !checked) rule.canWrite = false
      if (field === 'canWrite' && checked) rule.canRead = true
      return { ...previous, permissions: [...previous.permissions.filter(p => p.resource !== resource || p.resourceId !== id), rule] }
    })
  }

  const assignment = (value: string) => roles.some(r => r.id === value)
    ? { role: 'ReadOnly' as OrgRole, customRoleId: value }
    : { role: value as OrgRole, customRoleId: undefined }

  const roleOptions = <>
    <option value="ReadOnly">Read Only</option>
    <option value="Member">Member</option>
    {owner && <option value="Admin">Admin</option>}
    {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
  </>

  if (loading) return <p className="p-5 text-ink-muted">Loading roles…</p>

  return (
    <div className="space-y-5 text-ink-primary">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="font-semibold">Organization roles</h2><p className="text-xs text-ink-muted">{orgName}</p></div>
        <button className={buttonClass} disabled={busy} onClick={() => setDraft(newRole())}>New role</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <div className="space-y-2">
        {roles.length === 0 && <p className="text-sm text-ink-muted">No custom roles yet. Create a role and choose its permissions.</p>}
        {roles.map(role => (
          <div key={role.id} className="flex items-center justify-between gap-2 rounded-lg border border-edge-default p-3">
            <span>{role.name}</span>
            <div className="flex gap-2">
              <button className={buttonClass} disabled={busy} onClick={() => setDraft(structuredClone(role))}>Edit</button>
              <button className={buttonClass} disabled={busy || members.some(m => m.customRoleId === role.id)}
                title="Only unassigned roles can be deleted"
                onClick={() => run(async () => {
                  await rolesApi.delete(orgId, role.id)
                  setRoles(previous => previous.filter(r => r.id !== role.id))
                  if (draft?.id === role.id) setDraft(null)
                })}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {draft && (
        <fieldset disabled={busy} className="space-y-4 rounded-xl border border-edge-default bg-navy-800 p-4">
          <legend className="px-2 text-sm">{draft.id ? 'Edit role' : 'Create role'}</legend>
          <label className="block text-xs">Role name
            <input className={`${inputClass} mt-1`} maxLength={100} value={draft.name}
              onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Caretaker" />
          </label>
          <p className="text-xs text-ink-muted">Module permissions are the defaults. Write also allows creating resources. Individual rules override these defaults for the selected item.</p>
          <div className="flex gap-2">
            <button className={buttonClass} onClick={() => setDraft({ ...draft, permissions: RESOURCES.map(resource => ({ resource, resourceId: MODULE_ID, canRead: true, canWrite: true })) })}>Allow all</button>
            <button className={buttonClass} onClick={() => setDraft({ ...draft, permissions: newRole().permissions })}>Deny all</button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-ink-muted"><th className="py-2">Module</th><th>Read</th><th>Write</th></tr></thead>
            <tbody>{RESOURCES.map(resource => {
              const rule = draft.permissions.find(p => p.resource === resource && p.resourceId === MODULE_ID)
              return <tr key={resource} className="border-t border-edge-subtle">
                <td className="py-2 capitalize">{resource}</td>
                <td><input type="checkbox" aria-label={`Read ${resource}`} checked={rule?.canRead ?? false} onChange={e => setRule(resource, MODULE_ID, 'canRead', e.target.checked)} /></td>
                <td><input type="checkbox" aria-label={`Write ${resource}`} checked={rule?.canWrite ?? false} onChange={e => setRule(resource, MODULE_ID, 'canWrite', e.target.checked)} /></td>
              </tr>
            })}</tbody>
          </table>
          <h3 className="text-sm font-semibold">Individual resource permissions</h3>
          <p className="text-xs text-ink-muted">An individual rule can grant or deny access, overriding the module default. To share only one item, disable module access and enable Read for that item. Removing a rule restores the module default. Network rules include their IP entries.</p>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Resource module" className={inputClass} value={resource} onChange={e => { setResource(e.target.value); setOptions([]); setResourceId('') }}>
              {RESOURCES.filter(r => !['dashboard', 'diagram', 'settings'].includes(r)).map(r => <option key={r}>{r}</option>)}
            </select>
            <select aria-label="Individual resource" className={inputClass} value={resourceId} onChange={e => setResourceId(e.target.value)}>
              <option value="">Choose a resource</option>
              {options.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <button className={buttonClass} disabled={!resourceId || draft.permissions.some(p => p.resource === resource && p.resourceId === resourceId)} onClick={() => setRule(resource, resourceId, 'canRead', false)}>Add rule</button>
          </div>
          {draft.permissions.filter(p => p.resourceId !== MODULE_ID).map(rule => (
            <div key={`${rule.resource}/${rule.resourceId}`} className="space-y-2 rounded-lg border border-edge-subtle p-3 text-xs">
              <p className="break-all">{rule.resource}: {rule.resource === resource ? options.find(o => o.id === rule.resourceId)?.name ?? rule.resourceId : rule.resourceId}</p>
              <div className="flex items-center gap-4">
                <label><input type="checkbox" checked={rule.canRead} onChange={e => setRule(rule.resource, rule.resourceId, 'canRead', e.target.checked)} /> Read</label>
                <label><input type="checkbox" checked={rule.canWrite} onChange={e => setRule(rule.resource, rule.resourceId, 'canWrite', e.target.checked)} /> Write</label>
                <button className={buttonClass} onClick={() => setDraft({ ...draft, permissions: draft.permissions.filter(p => p !== rule) })}>Remove rule</button>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <button className={buttonClass} disabled={!draft.name.trim()} onClick={save}>{busy ? 'Saving…' : 'Save role'}</button>
            <button className={buttonClass} onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </fieldset>
      )}

      <h3 className="font-semibold">Member roles</h3>
      <p className="text-xs text-ink-muted">Changes apply to subsequent API requests. Open applications refresh permissions automatically.</p>
      {members.map(member => (
        <label key={member.userId} className="block space-y-1 text-xs">
          <span>{member.displayName || member.email} · {member.email}</span>
          <select className={inputClass} value={member.customRoleId ?? member.role}
            disabled={busy || member.role === 'Owner' || (!owner && member.role === 'Admin')}
            onChange={e => {
              const selected = assignment(e.target.value)
              void run(async () => {
                await rolesApi.assign(orgId, member.userId, selected.role, selected.customRoleId)
                setMembers(await organizationsApi.getMembers(orgId))
              })
            }}>
            {member.role === 'Owner' && <option value="Owner">Owner</option>}
            {!owner && member.role === 'Admin' && <option value="Admin">Admin</option>}
            {roleOptions}
          </select>
        </label>
      ))}
      <fieldset disabled={busy} className="space-y-2 border-t border-edge-default pt-4">
        <legend className="text-sm">Add an existing user</legend>
        <input className={inputClass} aria-label="Member email" placeholder="person@company.com" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <select className={inputClass} aria-label="New member role" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>{roleOptions}</select>
        <button className={buttonClass} disabled={!email.trim()} onClick={() => run(async () => {
          const selected = assignment(inviteRole)
          await organizationsApi.inviteMember(orgId, email.trim(), selected.role, selected.customRoleId)
          setMembers(await organizationsApi.getMembers(orgId))
          setEmail('')
        })}>Add member</button>
      </fieldset>
    </div>
  )
}
