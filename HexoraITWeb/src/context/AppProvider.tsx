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
  const { isAuthenticated } = useAuth()

  const [orgs, setOrgs] = useState<OrgMembership[]>([])
  const [currentOrgId, setCurrentOrgId] = useState<string>(() => localStorage.getItem(CURRENT_ORG_KEY) ?? '')
  const [data, setData] = useState(emptyOrgState())
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  const toast = useCallback((message: string, type: Toast['type'] = 'success') => {
    if (!message) return
    const id = crypto.randomUUID()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts(t => t.filter(x => x.id !== id)), [])

  const guarded = useCallback(async <T,>(fn: () => Promise<T>, failMessage: string): Promise<T> => {
    try {
      return await fn()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : failMessage
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
      .catch(() => toast('Failed to load organizations', 'error'))

  }, [isAuthenticated, toast])

  useEffect(() => {
    if (!currentOrgId) {
      queueMicrotask(() => setIsLoading(false))
      return
    }

    queueMicrotask(() => setIsLoading(true))

    Promise.all([
      assetsApi.getAll(currentOrgId), passwordsApi.getAll(currentOrgId), subnetsApi.getAll(currentOrgId),
      licensesApi.getAll(currentOrgId), contactsApi.getAll(currentOrgId), contractsApi.getAll(currentOrgId),
      plansApi.getAll(currentOrgId), incidentsApi.getAll(currentOrgId), knowledgeApi.getAll(currentOrgId),
      tasksApi.getAll(currentOrgId), projectsApi.getAll(currentOrgId), groupsApi.getAll(currentOrgId), warrantyApi.getAll(currentOrgId),
      diagramApi.get(currentOrgId),
    ]).then(([
      assets, passwords, subnets, licenses, contacts, contracts,
      plans, incidents, knowledgeArticles, tasks, projects, groups, warrantyItems, diagram,
    ]) => {
      setData({
        assets, passwords, subnets, licenses, contacts, contracts,
        plans, incidents, knowledgeArticles, tasks, projects, groups, warrantyItems,
        diagramNodes: diagram.nodes, diagramEdges: diagram.edges,
      })
    }).catch(() => toast('Failed to load organization data', 'error'))
      .finally(() => setIsLoading(false))
  }, [currentOrgId, toast])

  const currentOrg = orgs.find(o => o.id === currentOrgId)

  const switchOrg = useCallback((id: string) => {
    localStorage.setItem(CURRENT_ORG_KEY, id)
    setCurrentOrgId(id)
  }, [])

  const addOrg = useCallback(async (o: Omit<Organization, 'id'>) => {
    const created = await guarded(() => organizationsApi.create(o), 'Failed to create organization')
    setOrgs(prev => [...prev, { ...created, role: 'Owner' }])
    toast(`Organization "${o.name}" created`)
  }, [guarded, toast])

  const updateOrg = useCallback(async (id: string, o: Omit<Organization, 'id'>) => {
    await guarded(() => organizationsApi.update(id, o), 'Failed to update organization')
    setOrgs(prev => prev.map(x => x.id === id ? { ...x, ...o } : x))
    toast(`Organization "${o.name}" updated`)
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
    toast('Organization deleted', 'info')
  }, [guarded, currentOrgId, orgs, switchOrg, toast])

  const restoreOrg = useCallback(async (orgId: string) => {
    await guarded(() => organizationsApi.restore(orgId), 'Failed to restore organization')
    const summaries = await organizationsApi.getAll()
    const full = await Promise.all(summaries.map(async s => ({ ...(await organizationsApi.getById(s.id)), role: s.role })))
    setOrgs(full)
    toast('Organization restored')
  }, [guarded, toast])

  // ── Assets ──
  const addAsset = useCallback(async (a: Omit<Asset, 'id' | 'updated'>) => {
    const created = await guarded(() => assetsApi.create(currentOrgId, a), 'Failed to create asset')
    setData(d => ({ ...d, assets: [created, ...d.assets] }))
    toast(`Asset "${a.name}" created`)
  }, [currentOrgId, guarded, toast])

  const updateAsset = useCallback(async (a: Asset) => {
    await guarded(() => assetsApi.update(a.id, a), 'Failed to update asset')
    setData(d => ({ ...d, assets: d.assets.map(x => x.id === a.id ? { ...a, updated: 'just now' } : x) }))
    toast(`Asset "${a.name}" updated`)
  }, [guarded, toast])

  const deleteAsset = useCallback(async (id: string) => {
    const name = data.assets.find(a => a.id === id)?.name
    await guarded(() => assetsApi.delete(id), 'Failed to delete asset')
    setData(d => ({ ...d, assets: d.assets.filter(a => a.id !== id) }))
    toast(`Asset "${name}" deleted`, 'info')
  }, [data.assets, guarded, toast])

  const toggleStarAsset = useCallback(async (id: string) => {
    const { starred } = await guarded(() => assetsApi.toggleStar(id), 'Failed to update asset')
    setData(d => ({ ...d, assets: d.assets.map(a => a.id === id ? { ...a, starred } : a) }))
  }, [guarded])

  // ── Passwords ──
  const addPassword = useCallback(async (p: Omit<PasswordEntry, 'id' | 'updated' | 'strength'> & { password: string }) => {
    const created = await guarded(() => passwordsApi.create(currentOrgId, p), 'Failed to save password')
    setData(d => ({ ...d, passwords: [created, ...d.passwords] }))
    toast(`Password "${p.name}" saved`)
  }, [currentOrgId, guarded, toast])

  const updatePassword = useCallback(async (p: PasswordEntry & { password?: string }) => {
    await guarded(() => passwordsApi.update(p.id, p), 'Failed to update password')
    setData(d => ({ ...d, passwords: d.passwords.map(x => x.id === p.id ? { ...x, ...p } : x) }))
    toast(`Password "${p.name}" updated`)
  }, [guarded, toast])

  const deletePassword = useCallback(async (id: string) => {
    const name = data.passwords.find(p => p.id === id)?.name
    await guarded(() => passwordsApi.delete(id), 'Failed to delete password')
    setData(d => ({ ...d, passwords: d.passwords.filter(p => p.id !== id) }))
    toast(`Password "${name}" deleted`, 'info')
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
    toast(`Subnet "${s.name}" added`)
  }, [currentOrgId, guarded, toast])

  const updateSubnet = useCallback(async (s: Subnet) => {
    await guarded(() => subnetsApi.update(s.id, s), 'Failed to update subnet')
    setData(d => ({ ...d, subnets: d.subnets.map(x => x.id === s.id ? s : x) }))
    toast(`Subnet "${s.name}" updated`)
  }, [guarded, toast])

  const deleteSubnet = useCallback(async (id: string) => {
    const name = data.subnets.find(s => s.id === id)?.name
    await guarded(() => subnetsApi.delete(id), 'Failed to delete subnet')
    setData(d => ({ ...d, subnets: d.subnets.filter(s => s.id !== id) }))
    toast(`Subnet "${name}" deleted`, 'info')
  }, [data.subnets, guarded, toast])

  const addIPEntry = useCallback(async (subnetId: string, e: Omit<IPEntry, 'id'>) => {
    const created = await guarded(() => subnetsApi.addIp(subnetId, e), 'Failed to add IP entry')
    setData(d => ({ ...d, subnets: d.subnets.map(s => s.id === subnetId ? { ...s, ips: [...s.ips, created] } : s) }))
    toast(`IP ${e.ip} added`)
  }, [guarded, toast])

  const updateIPEntry = useCallback(async (subnetId: string, e: IPEntry) => {
    await guarded(() => subnetsApi.updateIp(subnetId, e), 'Failed to update IP entry')
    setData(d => ({ ...d, subnets: d.subnets.map(s => s.id === subnetId ? { ...s, ips: s.ips.map(ip => ip.id === e.id ? e : ip) } : s) }))
  }, [guarded])

  const deleteIPEntry = useCallback(async (subnetId: string, entryId: string) => {
    await guarded(() => subnetsApi.deleteIp(subnetId, entryId), 'Failed to delete IP entry')
    setData(d => ({ ...d, subnets: d.subnets.map(s => s.id === subnetId ? { ...s, ips: s.ips.filter(ip => ip.id !== entryId) } : s) }))
    toast('IP entry deleted', 'info')
  }, [guarded, toast])

  // ── Licenses ──
  const addLicense = useCallback(async (l: Omit<License, 'id' | 'status'>) => {
    const created = await guarded(() => licensesApi.create(currentOrgId, l), 'Failed to add license')
    setData(d => ({ ...d, licenses: [created, ...d.licenses] }))
    toast(`License "${l.name}" added`)
  }, [currentOrgId, guarded, toast])

  const updateLicense = useCallback(async (l: License) => {
    await guarded(() => licensesApi.update(l.id, l), 'Failed to update license')
    setData(d => ({ ...d, licenses: d.licenses.map(x => x.id === l.id ? l : x) }))
    toast(`License "${l.name}" updated`)
  }, [guarded, toast])

  const deleteLicense = useCallback(async (id: string) => {
    const name = data.licenses.find(l => l.id === id)?.name
    await guarded(() => licensesApi.delete(id), 'Failed to delete license')
    setData(d => ({ ...d, licenses: d.licenses.filter(l => l.id !== id) }))
    toast(`License "${name}" deleted`, 'info')
  }, [data.licenses, guarded, toast])

  const toggleStarLicense = useCallback(async (id: string) => {
    const { starred } = await guarded(() => licensesApi.toggleStar(id), 'Failed to update license')
    setData(d => ({ ...d, licenses: d.licenses.map(l => l.id === id ? { ...l, starred } : l) }))
  }, [guarded])

  // ── Contacts ──
  const addContact = useCallback(async (c: Omit<Contact, 'id'>) => {
    const created = await guarded(() => contactsApi.create(currentOrgId, c), 'Failed to add contact')
    setData(d => ({ ...d, contacts: [created, ...d.contacts] }))
    toast(`Contact "${c.name}" added`)
  }, [currentOrgId, guarded, toast])

  const updateContact = useCallback(async (c: Contact) => {
    await guarded(() => contactsApi.update(c.id, c), 'Failed to update contact')
    setData(d => ({ ...d, contacts: d.contacts.map(x => x.id === c.id ? c : x) }))
    toast(`Contact "${c.name}" updated`)
  }, [guarded, toast])

  const deleteContact = useCallback(async (id: string) => {
    const name = data.contacts.find(c => c.id === id)?.name
    await guarded(() => contactsApi.delete(id), 'Failed to delete contact')
    setData(d => ({ ...d, contacts: d.contacts.filter(c => c.id !== id) }))
    toast(`Contact "${name}" deleted`, 'info')
  }, [data.contacts, guarded, toast])

  const toggleStarContact = useCallback(async (id: string) => {
    const { starred } = await guarded(() => contactsApi.toggleStar(id), 'Failed to update contact')
    setData(d => ({ ...d, contacts: d.contacts.map(c => c.id === id ? { ...c, starred } : c) }))
  }, [guarded])

  // ── Contracts ──
  const reloadContracts = useCallback(async () => {
    const contracts = await guarded(() => contractsApi.getAll(currentOrgId), 'Failed to reload contracts data')
    setData(d => ({ ...d, contracts: contracts}))
    toast(`Contracts loaded`, 'info')
  }, [guarded, toast, currentOrgId])

  const addContract = useCallback(async (c: Omit<Contract, 'id' | 'status'>) => {
    const created = await guarded(() => contractsApi.create(currentOrgId, c), 'Failed to add contract')
    setData(d => ({ ...d, contracts: [created, ...d.contracts] }))
    toast(`Contract "${c.name}" added`)
  }, [currentOrgId, guarded, toast])

  const updateContract = useCallback(async (c: Contract) => {
    await guarded(() => contractsApi.update(c.id, c), 'Failed to update contract')
    setData(d => ({ ...d, contracts: d.contracts.map(x => x.id === c.id ? c : x) }))
    toast(`Contract "${c.name}" updated`)
  }, [guarded, toast])

  const deleteContract = useCallback(async (id: string) => {
    const name = data.contracts.find(c => c.id === id)?.name
    await guarded(() => contractsApi.delete(id), 'Failed to delete contract')
    setData(d => ({ ...d, contracts: d.contracts.filter(c => c.id !== id) }))
    toast(`Contract "${name}" deleted`, 'info')
  }, [data.contracts, guarded, toast])

  const toggleStarContract = useCallback(async (id: string) => {
    const { starred } = await guarded(() => contractsApi.toggleStar(id), 'Failed to update contract')
    setData(d => ({ ...d, contracts: d.contracts.map(c => c.id === id ? { ...c, starred } : c) }))
  }, [guarded])

  // ── Plans ──
  const addPlan = useCallback(async (p: Omit<Plan, 'id' | 'createdAt'>) => {
    const created = await guarded(() => plansApi.create(currentOrgId, p), 'Failed to add plan')
    setData(d => ({ ...d, plans: [created, ...d.plans] }))
    toast(`Plan "${p.title}" added`)
  }, [currentOrgId, guarded, toast])

  const updatePlan = useCallback(async (p: Plan) => {
    await guarded(() => plansApi.update(p.id, p), 'Failed to update plan')
    setData(d => ({ ...d, plans: d.plans.map(x => x.id === p.id ? p : x) }))
    toast(`Plan "${p.title}" updated`)
  }, [guarded, toast])

  const deletePlan = useCallback(async (id: string) => {
    const title = data.plans.find(p => p.id === id)?.title
    await guarded(() => plansApi.delete(id), 'Failed to delete plan')
    setData(d => ({ ...d, plans: d.plans.filter(p => p.id !== id) }))
    toast(`Plan "${title}" deleted`, 'info')
  }, [data.plans, guarded, toast])

  // ── Incidents ──
  const addIncident = useCallback(async (i: Omit<Incident, 'id'>) => {
    const created = await guarded(() => incidentsApi.create(currentOrgId, i), 'Failed to log incident')
    setData(d => ({ ...d, incidents: [created, ...d.incidents] }))
    toast(`Incident "${i.title}" logged`)
  }, [currentOrgId, guarded, toast])

  const updateIncident = useCallback(async (i: Incident) => {
    await guarded(() => incidentsApi.update(i.id, i), 'Failed to update incident')
    setData(d => ({ ...d, incidents: d.incidents.map(x => x.id === i.id ? i : x) }))
    toast(`Incident "${i.title}" updated`)
  }, [guarded, toast])

  const deleteIncident = useCallback(async (id: string) => {
    const title = data.incidents.find(i => i.id === id)?.title
    await guarded(() => incidentsApi.delete(id), 'Failed to delete incident')
    setData(d => ({ ...d, incidents: d.incidents.filter(i => i.id !== id) }))
    toast(`Incident "${title}" deleted`, 'info')
  }, [data.incidents, guarded, toast])

  // ── Knowledge ──
  const addKnowledge = useCallback(async (a: Omit<KnowledgeArticle, 'id' | 'updatedAt'>) => {
    const created = await guarded(() => knowledgeApi.create(currentOrgId, a), 'Failed to save article')
    setData(d => ({ ...d, knowledgeArticles: [created, ...d.knowledgeArticles] }))
    toast(`Article "${a.title}" saved`)
  }, [currentOrgId, guarded, toast])

  const updateKnowledge = useCallback(async (a: KnowledgeArticle) => {
    await guarded(() => knowledgeApi.update(a.id, a), 'Failed to update article')
    setData(d => ({ ...d, knowledgeArticles: d.knowledgeArticles.map(x => x.id === a.id ? a : x) }))
    toast(`Article "${a.title}" updated`)
  }, [guarded, toast])

  const deleteKnowledge = useCallback(async (id: string) => {
    const title = data.knowledgeArticles.find(a => a.id === id)?.title
    await guarded(() => knowledgeApi.delete(id), 'Failed to delete article')
    setData(d => ({ ...d, knowledgeArticles: d.knowledgeArticles.filter(a => a.id !== id) }))
    toast(`Article "${title}" deleted`, 'info')
  }, [data.knowledgeArticles, guarded, toast])

  const toggleStarKnowledge = useCallback(async (id: string) => {
    const { starred } = await guarded(() => knowledgeApi.toggleStar(id), 'Failed to update article')
    setData(d => ({ ...d, knowledgeArticles: d.knowledgeArticles.map(a => a.id === id ? { ...a, starred } : a) }))
  }, [guarded])

  // Projects

  const addProject = useCallback(async (p: Omit<Project, 'id' | 'createdAt' | 'taskCount'>) => {
  const created = await guarded(() => projectsApi.create(currentOrgId, p), 'Failed to add project')
    setData(d => ({ ...d, projects: [created, ...d.projects] }))
    toast(`Project "${p.name}" created`)
    return created
  }, [currentOrgId, guarded, toast])

  const updateProject = useCallback(async (p: Project) => {
    await guarded(() => projectsApi.update(p.id, p), 'Failed to update project')
    setData(d => ({ ...d, projects: d.projects.map(x => x.id === p.id ? p : x) }))
    toast(`Project "${p.name}" updated`)
  }, [guarded, toast])

  const deleteProject = useCallback(async (id: string) => {
    const name = data.projects.find(p => p.id === id)?.name
    await guarded(() => projectsApi.delete(id), 'Failed to delete project')
    setData(d => ({
      ...d,
      projects: d.projects.filter(p => p.id !== id),
      tasks: d.tasks.map(t => t.projectId === id ? { ...t, projectId: undefined } : t), // matches SetNull server-side
    }))
    toast(`Project "${name}" deleted`, 'info')
  }, [data.projects, guarded, toast])

  // ── Tasks ──
  const addTask = useCallback(async (t: Omit<Task, 'id' | 'createdAt'>) => {
    const created = await guarded(() => tasksApi.create(currentOrgId, t), 'Failed to add task')
    setData(d => ({ ...d, tasks: [created, ...d.tasks] }))
    toast(`Task "${t.title}" added`)
  }, [currentOrgId, guarded, toast])

  const updateTask = useCallback(async (t: Task) => {
    await guarded(() => tasksApi.update(t.id, t), 'Failed to update task')
    setData(d => ({ ...d, tasks: d.tasks.map(x => x.id === t.id ? t : x) }))
    toast(`Task "${t.title}" updated`)
  }, [guarded, toast])

  const deleteTask = useCallback(async (id: string) => {
    const title = data.tasks.find(t => t.id === id)?.title
    await guarded(() => tasksApi.delete(id), 'Failed to delete task')
    setData(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) }))
    toast(`Task "${title}" deleted`, 'info')
  }, [data.tasks, guarded, toast])

  // ── Groups ──
  const addGroup = useCallback(async (g: Omit<Group, 'id' | 'createdAt'>) => {
    const created = await guarded(() => groupsApi.create(currentOrgId, g), 'Failed to add group')
    setData(d => ({ ...d, groups: [created, ...d.groups] }))
    toast(`Group "${g.name}" added`)
  }, [currentOrgId, guarded, toast])

  const updateGroup = useCallback(async (g: Group) => {
    await guarded(() => groupsApi.update(g.id, g), 'Failed to update group')
    setData(d => ({ ...d, groups: d.groups.map(x => x.id === g.id ? g : x) }))
    toast(`Group "${g.name}" updated`)
  }, [guarded, toast])

  const deleteGroup = useCallback(async (id: string) => {
    const name = data.groups.find(g => g.id === id)?.name
    await guarded(() => groupsApi.delete(id), 'Failed to delete group')
    setData(d => ({ ...d, groups: d.groups.filter(g => g.id !== id) }))
    toast(`Group "${name}" deleted`, 'info')
  }, [data.groups, guarded, toast])

  // ── Warranties ──
  const reloadWarranties = useCallback(async () => {
    const warranties = await guarded(() => warrantyApi.getAll(currentOrgId), 'Failed to reload warranties data')
    setData(d => ({ ...d, warrantyItems: warranties}))
    toast(`Warranties loaded`, 'info')
  }, [guarded, toast, currentOrgId])

  const addWarranty = useCallback(async (w: Omit<WarrantyItem, 'status'>) => {
    const created = await guarded(() => warrantyApi.create(currentOrgId, w), 'Failed to add warranty')
    setData(d => ({ ...d, warrantyItems: [created, ...d.warrantyItems] }))
    toast(`Warranty "${w.name}" added`)
  }, [currentOrgId, guarded, toast])

  const updateWarranty = useCallback(async (w: WarrantyItem) => {
    await guarded(() => warrantyApi.update(w.id, w), 'Failed to update warranty')
    setData(d => ({ ...d, warrantyItems: d.warrantyItems.map(x => x.id === w.id ? w : x) }))
    toast(`Warranty "${w.name}" updated`)
  }, [guarded, toast])

  const deleteWarranty = useCallback(async (id: string) => {
    const name = data.warrantyItems.find(w => w.id === id)?.name
    await guarded(() => warrantyApi.delete(id), 'Failed to delete warranty')
    setData(d => ({ ...d, warrantyItems: d.warrantyItems.filter(w => w.id !== id) }))
    toast(`Warranty "${name}" deleted`, 'info')
  }, [data.warrantyItems, guarded, toast])

  const toggleStarWarranty = useCallback(async (id: string) => {
    const { starred } = await guarded(() => warrantyApi.toggleStar(id), 'Failed to update warranty')
    setData(d => ({ ...d, warrantyItems: d.warrantyItems.map(w => w.id === id ? { ...w, starred } : w) }))
  }, [guarded])

  const uploadWarrantyDocument = useCallback(async (id: string, file: File) => {
    const updated = await guarded(() => warrantyApi.uploadDocument(id, file), 'Failed to upload document')
    setData(d => ({ ...d, warrantyItems: d.warrantyItems.map(w => w.id === id ? updated : w) }))
    toast('Document uploaded')
  }, [guarded, toast])

  // ── Diagram ──
  const saveDiagram = useCallback(async (nodes: DiagramNode[], edges: DiagramEdge[]) => {
    await guarded(() => diagramApi.save(currentOrgId, nodes, edges), 'Failed to save diagram')
    setData(d => ({ ...d, diagramNodes: nodes, diagramEdges: edges }))
  }, [currentOrgId, guarded])

  const value = {
    orgs, currentOrg, switchOrg, addOrg, updateOrg,inviteMember, removeMember, deleteOrg, restoreOrg,
    assets: data.assets, passwords: data.passwords, subnets: data.subnets, licenses: data.licenses,
    contacts: data.contacts, contracts: data.contracts, plans: data.plans, incidents: data.incidents,
    knowledgeArticles: data.knowledgeArticles, tasks: data.tasks, projects: data.projects,
    groups: data.groups, warrantyItems: data.warrantyItems, diagramNodes: data.diagramNodes, diagramEdges: data.diagramEdges,
    isLoading,
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