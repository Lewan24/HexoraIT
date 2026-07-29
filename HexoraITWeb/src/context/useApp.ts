import { createContext, useContext } from 'react'
import type {
  Organization, Asset, PasswordEntry, Subnet, IPEntry, License, Contact, Contract,
  Plan, Incident, KnowledgeArticle, Task, Group, WarrantyItem,
  DiagramNode, DiagramEdge, Toast,
  OrgMember,
  OrgRole,
  Project,
} from '../api/types'
import type { OrgMembership } from '../api/types'

export interface AppContextValue {
  orgs: OrgMembership[]; currentOrg: OrgMembership | undefined
  switchOrg: (id: string) => void; addOrg: (o: Omit<Organization, 'id'>) => Promise<void>
  updateOrg: (id: string, o: Omit<Organization, 'id'>) => Promise<void>
  inviteMember: (orgId: string, email: string, role: OrgRole) => Promise<OrgMember>
  removeMember: (orgId: string, userId: string) => Promise<void>
  deleteOrg: (orgId: string) => Promise<void>
  restoreOrg: (orgId: string) => Promise<void>
  assets: Asset[]; passwords: PasswordEntry[]; subnets: Subnet[]; licenses: License[]
  contacts: Contact[]; contracts: Contract[]; plans: Plan[]; incidents: Incident[]
  knowledgeArticles: KnowledgeArticle[]; projects: Project[]; tasks: Task[]
  groups: Group[]; warrantyItems: WarrantyItem[]; diagramNodes: DiagramNode[]; diagramEdges: DiagramEdge[]
  isLoading: boolean
  toasts: Toast[]; dismissToast: (id: string) => void; toast: (message: string, type?: Toast['type']) => void

  addAsset: (a: Omit<Asset, 'id' | 'updated'>) => Promise<void>
  updateAsset: (a: Asset) => Promise<void>
  deleteAsset: (id: string) => Promise<void>
  toggleStarAsset: (id: string) => Promise<void>

  addPassword: (p: Omit<PasswordEntry, 'id' | 'updated' | 'strength'> & { password: string }) => Promise<void>
  updatePassword: (p: PasswordEntry & { password?: string }) => Promise<void>
  deletePassword: (id: string) => Promise<void>
  toggleStarPassword: (id: string) => Promise<void>
  revealPassword: (id: string) => Promise<string>

  addSubnet: (s: Omit<Subnet, 'id' | 'ips'>) => Promise<void>
  updateSubnet: (s: Subnet) => Promise<void>
  deleteSubnet: (id: string) => Promise<void>
  addIPEntry: (subnetId: string, e: Omit<IPEntry, 'id'>) => Promise<void>
  updateIPEntry: (subnetId: string, e: IPEntry) => Promise<void>
  deleteIPEntry: (subnetId: string, entryId: string) => Promise<void>

  addLicense: (l: Omit<License, 'id' | 'status'>) => Promise<void>
  updateLicense: (l: License) => Promise<void>
  deleteLicense: (id: string) => Promise<void>
  toggleStarLicense: (id: string) => Promise<void>

  addContact: (c: Omit<Contact, 'id'>) => Promise<void>
  updateContact: (c: Contact) => Promise<void>
  deleteContact: (id: string) => Promise<void>
  toggleStarContact: (id: string) => Promise<void>

  addContract: (c: Omit<Contract, 'id' | 'status'>) => Promise<void>
  updateContract: (c: Contract) => Promise<void>
  deleteContract: (id: string) => Promise<void>
  toggleStarContract: (id: string) => Promise<void>

  addPlan: (p: Omit<Plan, 'id' | 'createdAt'>) => Promise<void>
  updatePlan: (p: Plan) => Promise<void>
  deletePlan: (id: string) => Promise<void>

  addIncident: (i: Omit<Incident, 'id'>) => Promise<void>
  updateIncident: (i: Incident) => Promise<void>
  deleteIncident: (id: string) => Promise<void>

  addKnowledge: (a: Omit<KnowledgeArticle, 'id' | 'updatedAt'>) => Promise<void>
  updateKnowledge: (a: KnowledgeArticle) => Promise<void>
  deleteKnowledge: (id: string) => Promise<void>
  toggleStarKnowledge: (id: string) => Promise<void>

  addProject: (p: Omit<Project, 'id' | 'createdAt' | 'taskCount'>) => Promise<Project>
  updateProject: (p: Project) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  addTask: (t: Omit<Task, 'id' | 'createdAt'>) => Promise<void>
  updateTask: (t: Task) => Promise<void>
  deleteTask: (id: string) => Promise<void>

  addGroup: (g: Omit<Group, 'id' | 'createdAt'>) => Promise<void>
  updateGroup: (g: Group) => Promise<void>
  deleteGroup: (id: string) => Promise<void>

  reloadWarranties: () => Promise<void>
  addWarranty: (w: Omit<WarrantyItem, 'status'>) => Promise<void>
  updateWarranty: (w: WarrantyItem) => Promise<void>
  deleteWarranty: (id: string) => Promise<void>
  toggleStarWarranty: (id: string) => Promise<void>
  uploadWarrantyDocument: (id: string, file: File) => Promise<void>

  saveDiagram: (nodes: DiagramNode[], edges: DiagramEdge[]) => Promise<void>
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}