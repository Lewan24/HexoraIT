import { tr, useLocale } from '../i18n'
import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { AppContext } from './useApp'
import { useAuth } from './useAuth'
import type {
  Organization, Asset, PasswordEntry, Subnet, IPEntry, License, Contact, Contract,
  Plan, Incident, KnowledgeArticle, Task, Group, WarrantyItem,
  DiagramNode, DiagramEdge, Toast,
  OrgMembership,
  OrgRole,
  Project,
} from '../api/types'
import {
  organizationsApi, assetsApi, passwordsApi, subnetsApi, licensesApi,
  contactsApi, contractsApi, plansApi, incidentsApi, knowledgeApi,
  tasksApi, groupsApi, warrantyApi, diagramApi,
  projectsApi,
} from '../api/resources'
import { ApiError } from '../api/http'
import { v7 as uuidv7 } from 'uuid';
import { rolesApi } from '../api/roles'
import { hasPermission } from '../lib/permissions'
import type { OrganizationAccess } from '../api/types'

function emptyOrgState() {
  return {
    assets: [] as Asset[], passwords: [] as PasswordEntry[], subnets: [] as Subnet[],
    licenses: [] as License[], contacts: [] as Contact[], contracts: [] as Contract[],
    plans: [] as Plan[], incidents: [] as Incident[], knowledgeArticles: [] as KnowledgeArticle[],
    tasks: [] as Task[], projects: [] as Project[], groups: [] as Group[], warrantyItems: [] as WarrantyItem[],
    diagramNodes: [] as DiagramNode[], diagramEdges: [] as DiagramEdge[],
  }
}

const CURRENT_ORG_KEY = 'current_org_id'

export function AppProvider({ children }: { children: ReactNode }) {
  useLocale()
  const { isAuthenticated } = useAuth()

  const [orgs, setOrgs] = useState<OrgMembership[]>([])
  const [currentOrgId, setCurrentOrgId] = useState<string>(() => localStorage.getItem(CURRENT_ORG_KEY) ?? '')
  const [data, setData] = useState(emptyOrgState())
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const [accessState, setAccessState] = useState<{ orgId: string; access: OrganizationAccess }>()
  const [loadedAccess, setLoadedAccess] = useState<OrganizationAccess>()
  const [accessError, setAccessError] = useState('')
  const access = accessState?.orgId === currentOrgId ? accessState.access : undefined
  const canRead = (resource: string, id?: string) => hasPermission(access, resource, false, id)
  const canWrite = (resource: string, id?: string) => hasPermission(access, resource, true, id)

  const toast = useCallback((message: string, type: Toast['type'] = 'success') => {
    if (!message) return
    const id = uuidv7()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts(t => t.filter(x => x.id !== id)), [])

  const guarded = useCallback(async <T,>(fn: () => Promise<T>, failMessage: string): Promise<T> => {
    try {
      return await fn()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : tr(failMessage)
      toast(message, 'error')
      throw err
    }
  }, [toast])

  useEffect(() => {
    if (!isAuthenticated) {
      queueMicrotask(() => {
        setOrgs([])
        setCurrentOrgId('')
        setData(emptyOrgState())
        setIsLoading(false)
      })
      return
    }

    organizationsApi.getAll()
      .then(async summaries => {
        const full = await Promise.all(
          summaries.map(async s => ({
            ...(await organizationsApi.getById(s.id)),
            role: s.role
          }))
        )

        setOrgs(full)

        setCurrentOrgId(prev => {
          const stillValid = full.some(o => o.id === prev)
          const next = stillValid ? prev : (full[0]?.id ?? '')

          if (next) {
            localStorage.setItem(CURRENT_ORG_KEY, next)
          }

          return next
        })
      })
      .catch(() => toast(tr("Failed to load organizations"), 'error'))

  }, [isAuthenticated, toast])

  useEffect(() => {
    if (!isAuthenticated || !currentOrgId) return
    let cancelled = false
    const refresh = async () => {
      try {
        const next = await rolesApi.access(currentOrgId)
        if (!cancelled) {
          setAccessError('')
          setAccessState(previous =>
            previous?.orgId === currentOrgId && JSON.stringify(previous.access) === JSON.stringify(next)
              ? previous : { orgId: currentOrgId, access: next })
        }
      } catch {
        if (!cancelled) {
          setAccessState(undefined)
          setAccessError(tr('Organization access is unavailable. Check your connection or contact an organization administrator.'))
          setData(emptyOrgState())
        }
      }
    }
    void refresh()
    const timer = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    window.addEventListener('organization-access-changed', refresh)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('organization-access-changed', refresh)
    }
  }, [currentOrgId, isAuthenticated])

  useEffect(() => {
    let cancelled = false
    if (!currentOrgId || !access || !isAuthenticated) {
      queueMicrotask(() => setData(emptyOrgState()))
      queueMicrotask(() => setIsLoading(false))
      return
    }

    queueMicrotask(() => {
      setData(emptyOrgState())
      setIsLoading(true)
    })

    const load = <T,>(resource: string, fetch: () => Promise<T[]>) =>
      hasPermission(access, resource) ? fetch() : Promise.resolve([] as T[])

    Promise.all([
      load('assets', () => assetsApi.getAll(currentOrgId)),
      load('passwords', () => passwordsApi.getAll(currentOrgId)),
      load('networks', () => subnetsApi.getAll(currentOrgId)),
      load('licenses', () => licensesApi.getAll(currentOrgId)),
      load('contacts', () => contactsApi.getAll(currentOrgId)),
      load('contracts', () => contractsApi.getAll(currentOrgId)),
      load('plans', () => plansApi.getAll(currentOrgId)),
      load('incidents', () => incidentsApi.getAll(currentOrgId)),
      load('knowledge', () => knowledgeApi.getAll(currentOrgId)),
      load('tasks', () => tasksApi.getAll(currentOrgId)),
      load('projects', () => projectsApi.getAll(currentOrgId)),
      load('groups', () => groupsApi.getAll(currentOrgId)),
      load('warranty', () => warrantyApi.getAll(currentOrgId)),
      hasPermission(access, 'diagram') ? diagramApi.get(currentOrgId) : Promise.resolve({ nodes: [], edges: [] }),
    ]).then(([
      assets, passwords, subnets, licenses, contacts, contracts,
      plans, incidents, knowledgeArticles, tasks, projects, groups, warrantyItems, diagram,
    ]) => {
      if (cancelled) return
      setLoadedAccess(access)
      setData({
        assets, passwords, subnets, licenses, contacts, contracts,
        plans, incidents, knowledgeArticles, tasks, projects, groups, warrantyItems,
        diagramNodes: diagram.nodes, diagramEdges: diagram.edges,
      })
    }).catch(() => {
      if (!cancelled) {
        setData(emptyOrgState())
        toast(tr("Failed to load organization data"), 'error')
      }
    }).finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [currentOrgId, access, isAuthenticated, toast])

  const currentOrg = orgs.find(o => o.id === currentOrgId)

  const switchOrg = useCallback((id: string) => {
    setData(emptyOrgState())
    setAccessState(undefined)
    setAccessError('')
    localStorage.setItem(CURRENT_ORG_KEY, id)
    setCurrentOrgId(id)
  }, [])

  const addOrg = useCallback(async (o: Omit<Organization, 'id'>) => {
    const created = await guarded(() => organizationsApi.create(o), 'Failed to create organization')
    setOrgs(prev => [...prev, { ...created, role: 'Owner' }])
    toast(tr("Organization \"{{value1}}\" created", { value1: o.name }))
  }, [guarded, toast])

  const updateOrg = useCallback(async (id: string, o: Omit<Organization, 'id'>) => {
    await guarded(() => organizationsApi.update(id, o), 'Failed to update organization')
    setOrgs(prev => prev.map(x => x.id === id ? { ...x, ...o } : x))
    toast(tr("Organization \"{{value1}}\" updated", { value1: o.name }))
  }, [guarded, toast])

  const inviteMember = useCallback(async (orgId: string, email: string, role: OrgRole) => {
    return guarded(() => organizationsApi.inviteMember(orgId, email, role), 'Failed to add member')
  }, [guarded])

  const removeMember = useCallback(async (orgId: string, userId: string) => {
    await guarded(() => organizationsApi.removeMember(orgId, userId), 'Failed to remove member')
    if (userId === user?.id) {
      setOrgs(prev => prev.filter(o => o.id !== orgId))
      if (currentOrgId === orgId) {
        const next = orgs.find(o => o.id !== orgId)
        switchOrg(next?.id ?? '')
      }
    }
  }, [guarded, user, currentOrgId, orgs, switchOrg])

  const deleteOrg = useCallback(async (orgId: string) => {
    await guarded(() => organizationsApi.softDelete(orgId), 'Failed to delete organization')
    setOrgs(prev => prev.filter(o => o.id !== orgId))
    if (currentOrgId === orgId) {
      const next = orgs.find(o => o.id !== orgId)
      switchOrg(next?.id ?? '')
    }
    toast(tr("Organization deleted"), 'info')
  }, [guarded, currentOrgId, orgs, switchOrg, toast])

  const restoreOrg = useCallback(async (orgId: string) => {
    await guarded(() => organizationsApi.restore(orgId), 'Failed to restore organization')
    const summaries = await organizationsApi.getAll()
    const full = await Promise.all(summaries.map(async s => ({ ...(await organizationsApi.getById(s.id)), role: s.role })))
    setOrgs(full)
    toast(tr("Organization restored"))
  }, [guarded, toast])

  // ── Assets ──
  const addAsset = useCallback(async (a: Omit<Asset, 'id' | 'updated'>) => {
    const created = await guarded(() => assetsApi.create(currentOrgId, a), 'Failed to create asset')
    setData(d => ({ ...d, assets: [created, ...d.assets] }))
    toast(tr("Asset \"{{value1}}\" created", { value1: a.name }))
  }, [currentOrgId, guarded, toast])

  const updateAsset = useCallback(async (a: Asset) => {
    await guarded(() => assetsApi.update(a.id, a), 'Failed to update asset')
    setData(d => ({ ...d, assets: d.assets.map(x => x.id === a.id ? { ...a, updated: 'just now' } : x) }))
    toast(tr("Asset \"{{value1}}\" updated", { value1: a.name }))
  }, [guarded, toast])

  const deleteAsset = useCallback(async (id: string) => {
    const name = data.assets.find(a => a.id === id)?.name
    await guarded(() => assetsApi.delete(id), 'Failed to delete asset')
    setData(d => ({ ...d, assets: d.assets.filter(a => a.id !== id) }))
    toast(tr("Asset \"{{value1}}\" deleted", { value1: name }), 'info')
  }, [data.assets, guarded, toast])

  const toggleStarAsset = useCallback(async (id: string) => {
    const { starred } = await guarded(() => assetsApi.toggleStar(id), 'Failed to update asset')
    setData(d => ({ ...d, assets: d.assets.map(a => a.id === id ? { ...a, starred } : a) }))
  }, [guarded])

  // ── Passwords ──
  const addPassword = useCallback(async (p: Omit<PasswordEntry, 'id' | 'updated' | 'strength'> & { password: string }) => {
    const created = await guarded(() => passwordsApi.create(currentOrgId, p), 'Failed to save password')
    setData(d => ({ ...d, passwords: [created, ...d.passwords] }))
    toast(tr("Password \"{{value1}}\" saved", { value1: p.name }))
  }, [currentOrgId, guarded, toast])

  const updatePassword = useCallback(async (p: PasswordEntry & { password?: string }) => {
    await guarded(() => passwordsApi.update(p.id, p), 'Failed to update password')
    setData(d => ({ ...d, passwords: d.passwords.map(x => x.id === p.id ? { ...x, ...p } : x) }))
    toast(tr("Password \"{{value1}}\" updated", { value1: p.name }))
  }, [guarded, toast])

  const deletePassword = useCallback(async (id: string) => {
    const name = data.passwords.find(p => p.id === id)?.name
    await guarded(() => passwordsApi.delete(id), 'Failed to delete password')
    setData(d => ({ ...d, passwords: d.passwords.filter(p => p.id !== id) }))
    toast(tr("Password \"{{value1}}\" deleted", { value1: name }), 'info')
  }, [data.passwords, guarded, toast])

  const toggleStarPassword = useCallback(async (id: string) => {
    const { starred } = await guarded(() => passwordsApi.toggleStar(id), 'Failed to update password')
    setData(d => ({ ...d, passwords: d.passwords.map(p => p.id === id ? { ...p, starred } : p) }))
  }, [guarded])

  const revealPassword = useCallback(async (id: string) => {
    return guarded(() => passwordsApi.reveal(id), 'Failed to reveal password')
  }, [guarded])

  // ── Subnets / IPs ──
  const addSubnet = useCallback(async (s: Omit<Subnet, 'id' | 'ips'>) => {
    const created = await guarded(() => subnetsApi.create(currentOrgId, s), 'Failed to add subnet')
    setData(d => ({ ...d, subnets: [created, ...d.subnets] }))
    toast(tr("Subnet \"{{value1}}\" added", { value1: s.name }))
  }, [currentOrgId, guarded, toast])

  const updateSubnet = useCallback(async (s: Subnet) => {
    await guarded(() => subnetsApi.update(s.id, s), 'Failed to update subnet')
    setData(d => ({ ...d, subnets: d.subnets.map(x => x.id === s.id ? s : x) }))
    toast(tr("Subnet \"{{value1}}\" updated", { value1: s.name }))
  }, [guarded, toast])

  const deleteSubnet = useCallback(async (id: string) => {
    const name = data.subnets.find(s => s.id === id)?.name
    await guarded(() => subnetsApi.delete(id), 'Failed to delete subnet')
    setData(d => ({ ...d, subnets: d.subnets.filter(s => s.id !== id) }))
    toast(tr("Subnet \"{{value1}}\" deleted", { value1: name }), 'info')
  }, [data.subnets, guarded, toast])

  const addIPEntry = useCallback(async (subnetId: string, e: Omit<IPEntry, 'id'>) => {
    const created = await guarded(() => subnetsApi.addIp(subnetId, e), 'Failed to add IP entry')
    setData(d => ({ ...d, subnets: d.subnets.map(s => s.id === subnetId ? { ...s, ips: [...s.ips, created] } : s) }))
    toast(tr("IP {{value1}} added", { value1: e.ip }))
  }, [guarded, toast])

  const updateIPEntry = useCallback(async (subnetId: string, e: IPEntry) => {
    await guarded(() => subnetsApi.updateIp(subnetId, e), 'Failed to update IP entry')
    setData(d => ({ ...d, subnets: d.subnets.map(s => s.id === subnetId ? { ...s, ips: s.ips.map(ip => ip.id === e.id ? e : ip) } : s) }))
  }, [guarded])

  const deleteIPEntry = useCallback(async (subnetId: string, entryId: string) => {
    await guarded(() => subnetsApi.deleteIp(subnetId, entryId), 'Failed to delete IP entry')
    setData(d => ({ ...d, subnets: d.subnets.map(s => s.id === subnetId ? { ...s, ips: s.ips.filter(ip => ip.id !== entryId) } : s) }))
    toast(tr("IP entry deleted"), 'info')
  }, [guarded, toast])

  // ── Licenses ──
  const addLicense = useCallback(async (l: Omit<License, 'id' | 'status'>) => {
    const created = await guarded(() => licensesApi.create(currentOrgId, l), 'Failed to add license')
    setData(d => ({ ...d, licenses: [created, ...d.licenses] }))
    toast(tr("License \"{{value1}}\" added", { value1: l.name }))
  }, [currentOrgId, guarded, toast])

  const updateLicense = useCallback(async (l: License) => {
    await guarded(() => licensesApi.update(l.id, l), 'Failed to update license')
    setData(d => ({ ...d, licenses: d.licenses.map(x => x.id === l.id ? l : x) }))
    toast(tr("License \"{{value1}}\" updated", { value1: l.name }))
  }, [guarded, toast])

  const deleteLicense = useCallback(async (id: string) => {
    const name = data.licenses.find(l => l.id === id)?.name
    await guarded(() => licensesApi.delete(id), 'Failed to delete license')
    setData(d => ({ ...d, licenses: d.licenses.filter(l => l.id !== id) }))
    toast(tr("License \"{{value1}}\" deleted", { value1: name }), 'info')
  }, [data.licenses, guarded, toast])

  const toggleStarLicense = useCallback(async (id: string) => {
    const { starred } = await guarded(() => licensesApi.toggleStar(id), 'Failed to update license')
    setData(d => ({ ...d, licenses: d.licenses.map(l => l.id === id ? { ...l, starred } : l) }))
  }, [guarded])

  // ── Contacts ──
  const addContact = useCallback(async (c: Omit<Contact, 'id'>) => {
    const created = await guarded(() => contactsApi.create(currentOrgId, c), 'Failed to add contact')
    setData(d => ({ ...d, contacts: [created, ...d.contacts] }))
    toast(tr("Contact \"{{value1}}\" added", { value1: c.name }))
  }, [currentOrgId, guarded, toast])

  const updateContact = useCallback(async (c: Contact) => {
    await guarded(() => contactsApi.update(c.id, c), 'Failed to update contact')
    setData(d => ({ ...d, contacts: d.contacts.map(x => x.id === c.id ? c : x) }))
    toast(tr("Contact \"{{value1}}\" updated", { value1: c.name }))
  }, [guarded, toast])

  const deleteContact = useCallback(async (id: string) => {
    const name = data.contacts.find(c => c.id === id)?.name
    await guarded(() => contactsApi.delete(id), 'Failed to delete contact')
    setData(d => ({ ...d, contacts: d.contacts.filter(c => c.id !== id) }))
    toast(tr("Contact \"{{value1}}\" deleted", { value1: name }), 'info')
  }, [data.contacts, guarded, toast])

  const toggleStarContact = useCallback(async (id: string) => {
    const { starred } = await guarded(() => contactsApi.toggleStar(id), 'Failed to update contact')
    setData(d => ({ ...d, contacts: d.contacts.map(c => c.id === id ? { ...c, starred } : c) }))
  }, [guarded])

  // ── Contracts ──
  const reloadContracts = useCallback(async () => {
    const contracts = await guarded(() => contractsApi.getAll(currentOrgId), 'Failed to reload contracts data')
    setData(d => ({ ...d, contracts: contracts}))
    toast(tr("Contracts loaded"), 'info')
  }, [guarded, toast, currentOrgId])

  const addContract = useCallback(async (c: Omit<Contract, 'id' | 'status'>) => {
    const created = await guarded(() => contractsApi.create(currentOrgId, c), 'Failed to add contract')
    setData(d => ({ ...d, contracts: [created, ...d.contracts] }))
    toast(tr("Contract \"{{value1}}\" added", { value1: c.name }))
  }, [currentOrgId, guarded, toast])

  const updateContract = useCallback(async (c: Contract) => {
    await guarded(() => contractsApi.update(c.id, c), 'Failed to update contract')
    setData(d => ({ ...d, contracts: d.contracts.map(x => x.id === c.id ? c : x) }))
    toast(tr("Contract \"{{value1}}\" updated", { value1: c.name }))
  }, [guarded, toast])

  const deleteContract = useCallback(async (id: string) => {
    const name = data.contracts.find(c => c.id === id)?.name
    await guarded(() => contractsApi.delete(id), 'Failed to delete contract')
    setData(d => ({ ...d, contracts: d.contracts.filter(c => c.id !== id) }))
    toast(tr("Contract \"{{value1}}\" deleted", { value1: name }), 'info')
  }, [data.contracts, guarded, toast])

  const toggleStarContract = useCallback(async (id: string) => {
    const { starred } = await guarded(() => contractsApi.toggleStar(id), 'Failed to update contract')
    setData(d => ({ ...d, contracts: d.contracts.map(c => c.id === id ? { ...c, starred } : c) }))
  }, [guarded])

  // ── Plans ──
  const addPlan = useCallback(async (p: Omit<Plan, 'id' | 'createdAt'>) => {
    const created = await guarded(() => plansApi.create(currentOrgId, p), 'Failed to add plan')
    setData(d => ({ ...d, plans: [created, ...d.plans] }))
    toast(tr("Plan \"{{value1}}\" added", { value1: p.title }))
  }, [currentOrgId, guarded, toast])

  const updatePlan = useCallback(async (p: Plan) => {
    await guarded(() => plansApi.update(p.id, p), 'Failed to update plan')
    setData(d => ({ ...d, plans: d.plans.map(x => x.id === p.id ? p : x) }))
    toast(tr("Plan \"{{value1}}\" updated", { value1: p.title }))
  }, [guarded, toast])

  const deletePlan = useCallback(async (id: string) => {
    const title = data.plans.find(p => p.id === id)?.title
    await guarded(() => plansApi.delete(id), 'Failed to delete plan')
    setData(d => ({ ...d, plans: d.plans.filter(p => p.id !== id) }))
    toast(tr("Plan \"{{value1}}\" deleted", { value1: title }), 'info')
  }, [data.plans, guarded, toast])

  // ── Incidents ──
  const addIncident = useCallback(async (i: Omit<Incident, 'id'>) => {
    const created = await guarded(() => incidentsApi.create(currentOrgId, i), 'Failed to log incident')
    setData(d => ({ ...d, incidents: [created, ...d.incidents] }))
    toast(tr("Incident \"{{value1}}\" logged", { value1: i.title }))
  }, [currentOrgId, guarded, toast])

  const updateIncident = useCallback(async (i: Incident) => {
    await guarded(() => incidentsApi.update(i.id, i), 'Failed to update incident')
    setData(d => ({ ...d, incidents: d.incidents.map(x => x.id === i.id ? i : x) }))
    toast(tr("Incident \"{{value1}}\" updated", { value1: i.title }))
  }, [guarded, toast])

  const deleteIncident = useCallback(async (id: string) => {
    const title = data.incidents.find(i => i.id === id)?.title
    await guarded(() => incidentsApi.delete(id), 'Failed to delete incident')
    setData(d => ({ ...d, incidents: d.incidents.filter(i => i.id !== id) }))
    toast(tr("Incident \"{{value1}}\" deleted", { value1: title }), 'info')
  }, [data.incidents, guarded, toast])

  // ── Knowledge ──
  const addKnowledge = useCallback(async (a: Omit<KnowledgeArticle, 'id' | 'updatedAt'>) => {
    const created = await guarded(() => knowledgeApi.create(currentOrgId, a), 'Failed to save article')
    setData(d => ({ ...d, knowledgeArticles: [created, ...d.knowledgeArticles] }))
    toast(tr("Article \"{{value1}}\" saved", { value1: a.title }))
  }, [currentOrgId, guarded, toast])

  const updateKnowledge = useCallback(async (a: KnowledgeArticle) => {
    await guarded(() => knowledgeApi.update(a.id, a), 'Failed to update article')
    setData(d => ({ ...d, knowledgeArticles: d.knowledgeArticles.map(x => x.id === a.id ? a : x) }))
    toast(tr("Article \"{{value1}}\" updated", { value1: a.title }))
  }, [guarded, toast])

  const deleteKnowledge = useCallback(async (id: string) => {
    const title = data.knowledgeArticles.find(a => a.id === id)?.title
    await guarded(() => knowledgeApi.delete(id), 'Failed to delete article')
    setData(d => ({ ...d, knowledgeArticles: d.knowledgeArticles.filter(a => a.id !== id) }))
    toast(tr("Article \"{{value1}}\" deleted", { value1: title }), 'info')
  }, [data.knowledgeArticles, guarded, toast])

  const toggleStarKnowledge = useCallback(async (id: string) => {
    const { starred } = await guarded(() => knowledgeApi.toggleStar(id), 'Failed to update article')
    setData(d => ({ ...d, knowledgeArticles: d.knowledgeArticles.map(a => a.id === id ? { ...a, starred } : a) }))
  }, [guarded])

  // Projects

  const addProject = useCallback(async (p: Omit<Project, 'id' | 'createdAt' | 'taskCount'>) => {
  const created = await guarded(() => projectsApi.create(currentOrgId, p), 'Failed to add project')
    setData(d => ({ ...d, projects: [created, ...d.projects] }))
    toast(tr("Project \"{{value1}}\" created", { value1: p.name }))
    return created
  }, [currentOrgId, guarded, toast])

  const updateProject = useCallback(async (p: Project) => {
    await guarded(() => projectsApi.update(p.id, p), 'Failed to update project')
    setData(d => ({ ...d, projects: d.projects.map(x => x.id === p.id ? p : x) }))
    toast(tr("Project \"{{value1}}\" updated", { value1: p.name }))
  }, [guarded, toast])

  const deleteProject = useCallback(async (id: string) => {
    const name = data.projects.find(p => p.id === id)?.name
    await guarded(() => projectsApi.delete(id), 'Failed to delete project')
    setData(d => ({
      ...d,
      projects: d.projects.filter(p => p.id !== id),
      tasks: d.tasks.map(t => t.projectId === id ? { ...t, projectId: undefined } : t), // matches SetNull server-side
    }))
    toast(tr("Project \"{{value1}}\" deleted", { value1: name }), 'info')
  }, [data.projects, guarded, toast])

  // ── Tasks ──
  const addTask = useCallback(async (t: Omit<Task, 'id' | 'createdAt'>) => {
    const created = await guarded(() => tasksApi.create(currentOrgId, t), 'Failed to add task')
    setData(d => ({ ...d, tasks: [created, ...d.tasks] }))
    toast(tr("Task \"{{value1}}\" added", { value1: t.title }))
  }, [currentOrgId, guarded, toast])

  const updateTask = useCallback(async (t: Task) => {
    await guarded(() => tasksApi.update(t.id, t), 'Failed to update task')
    setData(d => ({ ...d, tasks: d.tasks.map(x => x.id === t.id ? t : x) }))
    toast(tr("Task \"{{value1}}\" updated", { value1: t.title }))
  }, [guarded, toast])

  const deleteTask = useCallback(async (id: string) => {
    const title = data.tasks.find(t => t.id === id)?.title
    await guarded(() => tasksApi.delete(id), 'Failed to delete task')
    setData(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) }))
    toast(tr("Task \"{{value1}}\" deleted", { value1: title }), 'info')
  }, [data.tasks, guarded, toast])

  // ── Groups ──
  const addGroup = useCallback(async (g: Omit<Group, 'id' | 'createdAt'>) => {
    const created = await guarded(() => groupsApi.create(currentOrgId, g), 'Failed to add group')
    setData(d => ({ ...d, groups: [created, ...d.groups] }))
    toast(tr("Group \"{{value1}}\" added", { value1: g.name }))
  }, [currentOrgId, guarded, toast])

  const updateGroup = useCallback(async (g: Group) => {
    await guarded(() => groupsApi.update(g.id, g), 'Failed to update group')
    setData(d => ({ ...d, groups: d.groups.map(x => x.id === g.id ? g : x) }))
    toast(tr("Group \"{{value1}}\" updated", { value1: g.name }))
  }, [guarded, toast])

  const deleteGroup = useCallback(async (id: string) => {
    const name = data.groups.find(g => g.id === id)?.name
    await guarded(() => groupsApi.delete(id), 'Failed to delete group')
    setData(d => ({ ...d, groups: d.groups.filter(g => g.id !== id) }))
    toast(tr("Group \"{{value1}}\" deleted", { value1: name }), 'info')
  }, [data.groups, guarded, toast])

  // ── Warranties ──
  const reloadWarranties = useCallback(async () => {
    const warranties = await guarded(() => warrantyApi.getAll(currentOrgId), 'Failed to reload warranties data')
    setData(d => ({ ...d, warrantyItems: warranties}))
    toast(tr("Warranties loaded"), 'info')
  }, [guarded, toast, currentOrgId])

  const addWarranty = useCallback(async (w: Omit<WarrantyItem, 'status'>) => {
    const created = await guarded(() => warrantyApi.create(currentOrgId, w), 'Failed to add warranty')
    setData(d => ({ ...d, warrantyItems: [created, ...d.warrantyItems] }))
    toast(tr("Warranty \"{{value1}}\" added", { value1: w.name }))
  }, [currentOrgId, guarded, toast])

  const updateWarranty = useCallback(async (w: WarrantyItem) => {
    await guarded(() => warrantyApi.update(w.id, w), 'Failed to update warranty')
    setData(d => ({ ...d, warrantyItems: d.warrantyItems.map(x => x.id === w.id ? w : x) }))
    toast(tr("Warranty \"{{value1}}\" updated", { value1: w.name }))
  }, [guarded, toast])

  const deleteWarranty = useCallback(async (id: string) => {
    const name = data.warrantyItems.find(w => w.id === id)?.name
    await guarded(() => warrantyApi.delete(id), 'Failed to delete warranty')
    setData(d => ({ ...d, warrantyItems: d.warrantyItems.filter(w => w.id !== id) }))
    toast(tr("Warranty \"{{value1}}\" deleted", { value1: name }), 'info')
  }, [data.warrantyItems, guarded, toast])

  const toggleStarWarranty = useCallback(async (id: string) => {
    const { starred } = await guarded(() => warrantyApi.toggleStar(id), 'Failed to update warranty')
    setData(d => ({ ...d, warrantyItems: d.warrantyItems.map(w => w.id === id ? { ...w, starred } : w) }))
  }, [guarded])

  const uploadWarrantyDocument = useCallback(async (id: string, file: File) => {
    const updated = await guarded(() => warrantyApi.uploadDocument(id, file), 'Failed to upload document')
    setData(d => ({ ...d, warrantyItems: d.warrantyItems.map(w => w.id === id ? updated : w) }))
    toast(tr("Document uploaded"))
  }, [guarded, toast])

  // ── Diagram ──
  const saveDiagram = useCallback(async (nodes: DiagramNode[], edges: DiagramEdge[]) => {
    await guarded(() => diagramApi.save(currentOrgId, nodes, edges), 'Failed to save diagram')
    setData(d => ({ ...d, diagramNodes: nodes, diagramEdges: edges }))
  }, [currentOrgId, guarded])

  // Never expose data from the previous organization or permission revision to sidebar/search consumers.
  const visibleData = isAuthenticated && access && loadedAccess === access ? data : emptyOrgState()
  const value = {
    access, accessError, canRead, canWrite,
    orgs, currentOrg, switchOrg, addOrg, updateOrg,inviteMember, removeMember, deleteOrg, restoreOrg,
    ...visibleData,
    isLoading: isLoading || (!!access && loadedAccess !== access),
    toasts, dismissToast, toast,
    addAsset, updateAsset, deleteAsset, toggleStarAsset,
    addPassword, updatePassword, deletePassword, toggleStarPassword, revealPassword,
    addSubnet, updateSubnet, deleteSubnet, addIPEntry, updateIPEntry, deleteIPEntry,
    addLicense, updateLicense, deleteLicense, toggleStarLicense,
    addContact, updateContact, deleteContact, toggleStarContact,
    reloadContracts, addContract, updateContract, deleteContract, toggleStarContract,
    addPlan, updatePlan, deletePlan,
    addIncident, updateIncident, deleteIncident,
    addKnowledge, updateKnowledge, deleteKnowledge, toggleStarKnowledge,
    addTask, updateTask, deleteTask,
    addProject, updateProject, deleteProject,
    addGroup, updateGroup, deleteGroup,
    reloadWarranties, addWarranty, updateWarranty, deleteWarranty, toggleStarWarranty, uploadWarrantyDocument,
    saveDiagram,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
