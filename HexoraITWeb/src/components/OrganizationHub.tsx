import { useState } from 'react'
import { Archive, ArrowRight, BriefcaseBusiness, Building2, LayoutGrid, Loader2, Plus, Search, Settings2 } from 'lucide-react'
import { tr, useLocale, locale } from '../i18n'
import { useApp } from '../context/useApp'
import { useAuth } from '../context/useAuth'
import { canManageOrganization } from '../lib/organizationLifecycle'
import OrganizationCreateModal from './OrganizationCreateModal'
import OrganizationArchiveButton from './OrganizationArchiveButton'
import type { View } from '../App'
import type { OrgMembership } from '../api/types'

type Filter = 'active' | 'temporary' | 'permanent' | 'archived'

export default function OrganizationHub({ navigate }: { navigate: (view: View) => void }) {
  useLocale()
  const { user } = useAuth()
  const { orgs, currentOrg, switchOrg, orgsLoading, orgsError, refreshOrgs } = useApp()
  const [filter, setFilter] = useState<Filter>('active')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(12)
  const [createOpen, setCreateOpen] = useState(false)
  const active = orgs.filter(org => !org.isArchived)
  const archived = orgs.filter(org => org.isArchived)
  const temporary = active.filter(org => org.isTemporary)
  const permanent = active.filter(org => !org.isTemporary)
  const source = filter === 'archived' ? archived : filter === 'temporary' ? temporary : filter === 'permanent' ? permanent : active
  const query = search.trim().toLocaleLowerCase()
  const visible = source.filter(org => `${org.name} ${org.description}`.toLocaleLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name, locale()))
  const open = (org: OrgMembership, view: View = 'dashboard') => { switchOrg(org.id); navigate(view) }
  const selectFilter = (next: Filter) => { setFilter(next); setLimit(12) }
  return <div className="mx-auto max-w-[1400px] space-y-7 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-blue-400">{tr('Your workspace')}</p><h1 className="text-2xl font-semibold tracking-tight text-ink-primary sm:text-3xl">{tr('Organizations')}</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">{tr('Choose a company, continue an assignment, or return to an archived engagement.')}</p>{user?.displayName && <p className="mt-2 text-xs text-ink-muted">{user.displayName}</p>}</div>
      <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/10 hover:bg-blue-400"><Plus size={16} />{tr('New Organization')}</button>
    </header>
    {orgsError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/25 bg-red-500/5 p-4 text-sm text-red-400"><span>{orgsError}</span><button onClick={() => void refreshOrgs()} className="rounded-lg border border-red-500/25 px-3 py-1.5">{tr('Retry')}</button></div>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {([
        ['active', 'Active organizations', active.length, LayoutGrid],
        ['permanent', 'Permanent organizations', permanent.length, Building2],
        ['temporary', 'Temporary engagements', temporary.length, BriefcaseBusiness],
        ['archived', 'Organization archive', archived.length, Archive],
      ] as const).map(([id, label, count, Icon]) => <button key={id} aria-pressed={filter === id} onClick={() => selectFilter(id)} className={`rounded-2xl border p-4 text-left transition-colors sm:p-5 ${filter === id ? 'border-blue-500/40 bg-blue-500/10' : 'border-edge-subtle bg-navy-800 hover:border-edge-default'}`}>
        <div className="flex items-center justify-between"><Icon size={18} className={filter === id ? 'text-blue-400' : 'text-ink-muted'} /><span className="text-2xl font-semibold tabular-nums text-ink-primary">{count}</span></div><p className="mt-3 text-xs text-ink-secondary">{tr(label)}</p>
      </button>)}
    </div>
    <section className="space-y-4" aria-label={tr(filter === 'archived' ? 'Organization archive' : 'Active organizations')}>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold text-ink-primary">{tr(filter === 'archived' ? 'Organization archive' : filter === 'temporary' ? 'Temporary engagements' : filter === 'permanent' ? 'Permanent organizations' : 'Active organizations')} <span className="ml-2 text-sm font-normal text-ink-muted">{visible.length}</span></h2>
        <label className="flex w-full items-center gap-2 rounded-xl border border-edge-default bg-navy-800 px-3 py-2 sm:w-72"><Search size={15} className="text-ink-muted" /><input aria-label={tr('Search organizations')} placeholder={tr('Search organizations')} value={search} onChange={event => { setSearch(event.target.value); setLimit(12) }} className="w-full bg-transparent text-sm text-ink-primary outline-none placeholder:text-ink-muted" /></label>
      </div>
      {filter === 'archived' && <p className="text-xs leading-relaxed text-ink-muted">{tr('Completed work stays here with its documentation. Reactivate an organization to bring it back to the active list.')}</p>}
      {orgsLoading ? <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-ink-muted" /></div> : visible.length === 0 ? <div className="rounded-2xl border border-dashed border-edge-default p-10 text-center"><Building2 size={28} className="mx-auto mb-3 text-ink-muted" /><p className="text-sm text-ink-secondary">{tr(query ? 'No matching organizations' : filter === 'archived' ? 'The organization archive is empty' : 'No active organizations in this view')}</p>{!query && filter !== 'archived' && <button onClick={() => setCreateOpen(true)} className="mt-4 text-sm text-blue-400">{tr('Create your first organization')} →</button>}</div> : <>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.slice(0, limit).map(org => <article key={org.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-edge-subtle bg-navy-800 transition-colors hover:border-edge-default">
            <div className="flex flex-1 flex-col p-5"><div className="mb-4 flex items-start justify-between gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ backgroundColor: org.color }}>{org.initials}</span><span className={`rounded-full border px-2 py-1 text-[10px] ${org.isTemporary ? 'border-amber-500/20 bg-amber-500/5 text-amber-400' : 'border-edge-default text-ink-muted'}`}>{tr(org.isTemporary ? 'Temporary engagement' : 'Permanent organization')}</span></div>
              <h3 className="truncate text-base font-semibold text-ink-primary" title={org.name}>{org.name}</h3><p className="mt-2 line-clamp-2 min-h-10 text-xs leading-relaxed text-ink-muted">{org.description || tr('Company documentation and workspace')}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-ink-muted"><span>{tr(org.role)}</span>{currentOrg?.id === org.id && !org.isArchived && <span className="text-blue-400">· {tr('Last selected')}</span>}{org.isArchived && org.archivedAt && <span>· {new Date(org.archivedAt).toLocaleDateString(locale())}</span>}</div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-edge-subtle px-4 py-3">
              {org.isArchived ? <OrganizationArchiveButton org={org} /> : <button onClick={() => open(org)} className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-400 hover:bg-blue-500/20">{tr('Open workspace')}<ArrowRight size={13} /></button>}
              {!org.isArchived && <div className="flex items-center gap-1">{canManageOrganization(org) && <button onClick={() => open(org, 'organization-customization')} aria-label={tr('Customize organization')} title={tr('Customize organization')} className="rounded-lg p-2 text-ink-muted hover:bg-navy-700 hover:text-ink-primary"><Settings2 size={15} /></button>}<OrganizationArchiveButton org={org} /></div>}
              {org.isArchived && !canManageOrganization(org) && <span className="text-xs text-ink-muted">{tr('Ask an owner or administrator to reactivate')}</span>}
            </div>
          </article>)}
        </div>
        {visible.length > limit && <div className="flex justify-center"><button onClick={() => setLimit(previous => previous + 12)} className="rounded-xl border border-edge-default px-5 py-2 text-sm text-ink-secondary hover:bg-navy-800">{tr('Show more organizations')}</button></div>}
      </>}
    </section>
    {createOpen && <OrganizationCreateModal onClose={() => setCreateOpen(false)} onCreated={org => open(org)} />}
  </div>
}
