import type { View } from '../App'
import type {
  Asset, PasswordEntry, Contact, License, Contract, Plan,
  Incident, KnowledgeArticle, Task, Group, WarrantyItem, Subnet
} from '../api/types'

export interface SearchResult {
  id: string
  type: string
  label: string
  sub: string
  view: View
  targetId?: string // passed as the second arg to navigate() for detail views
}

interface SearchableData {
  assets: Asset[]
  passwords: PasswordEntry[]
  contacts: Contact[]
  licenses: License[]
  contracts: Contract[]
  plans: Plan[]
  incidents: Incident[]
  knowledgeArticles: KnowledgeArticle[]
  tasks: Task[]
  groups: Group[]
  warrantyItems: WarrantyItem[]
  subnets: Subnet[]
}

function matches(query: string, ...fields: (string | undefined)[]): boolean {
  const q = query.toLowerCase()
  return fields.some(f => f?.toLowerCase().includes(q))
}

const MAX_PER_TYPE = 5
const MAX_TOTAL = 24

export function buildSearchResults(data: SearchableData, query: string): SearchResult[] {
  const q = query.trim()
  if (q.length < 2) return []

  const results: SearchResult[] = []

  const push = (list: SearchResult[]) => results.push(...list.slice(0, MAX_PER_TYPE))

  push(
    data.assets
      .filter(a => matches(q, a.name, a.ip, a.location, a.owner, a.serial))
      .map(a => ({
        id: `asset-${a.id}`, type: 'Asset', label: a.name,
        sub: `${a.type} · ${a.location}`, view: 'asset-detail' as View, targetId: a.id,
      }))
  )

  // Password names/categories are searchable, never the stored secret — the
  // backend doesn't even return it outside the explicit reveal endpoint.
  push(
    data.passwords
      .filter(p => matches(q, p.name, p.username, p.category))
      .map(p => ({
        id: `password-${p.id}`, type: 'Password', label: p.name,
        sub: `${p.category} · ${p.username}`, view: 'passwords' as View,
      }))
  )

  push(
    data.knowledgeArticles
      .filter(a => matches(q, a.title, a.category, a.content, ...a.tags))
      .map(a => ({
        id: `kb-${a.id}`, type: 'Doc', label: a.title,
        sub: a.category, view: 'knowledge' as View,
      }))
  )

  push(
    data.contacts
      .filter(c => matches(q, c.name, c.company, c.role, c.email))
      .map(c => ({
        id: `contact-${c.id}`, type: 'Contact', label: c.name,
        sub: `${c.role} · ${c.company}`, view: 'contacts' as View,
      }))
  )

  push(
    data.licenses
      .filter(l => matches(q, l.name, l.vendor, l.category))
      .map(l => ({
        id: `license-${l.id}`, type: 'License', label: l.name,
        sub: `${l.vendor} · ${l.category}`, view: 'licenses' as View,
      }))
  )

  push(
    data.contracts
      .filter(c => matches(q, c.name, c.vendor, c.category))
      .map(c => ({
        id: `contract-${c.id}`, type: 'Contract', label: c.name,
        sub: `${c.vendor} · ${c.category}`, view: 'contracts' as View,
      }))
  )

  push(
    data.plans
      .filter(p => matches(q, p.title, p.description, ...p.tags))
      .map(p => ({
        id: `plan-${p.id}`, type: 'Plan', label: p.title,
        sub: p.status, view: 'plans' as View,
      }))
  )

  push(
    data.incidents
      .filter(i => matches(q, i.title, i.description, ...i.affectedSystems, ...i.tags))
      .map(i => ({
        id: `incident-${i.id}`, type: 'Incident', label: i.title,
        sub: `${i.severity} · ${i.status}`, view: 'incidents' as View,
      }))
  )

  push(
    data.tasks
      .filter(t => matches(q, t.title, t.description, t.assignee, ...t.tags))
      .map(t => ({
        id: `task-${t.id}`, type: 'Task', label: t.title,
        sub: `${t.status} · ${t.assignee || 'Unassigned'}`, view: 'tasks' as View,
      }))
  )

  push(
    data.groups
      .filter(g => matches(q, g.name, g.description, g.purpose))
      .map(g => ({
        id: `group-${g.id}`, type: 'Group', label: g.name,
        sub: g.type, view: 'groups' as View,
      }))
  )

  push(
    data.warrantyItems
      .filter(w => matches(q, w.name, w.vendor, w.serialNumber))
      .map(w => ({
        id: `warranty-${w.id}`, type: 'Warranty', label: w.name,
        sub: `${w.vendor} · ${w.serialNumber}`, view: 'warranty' as View,
      }))
  )

  push(
    data.subnets
      .filter(s => matches(q, s.name, s.cidr, s.type))
      .map(s => ({
        id: `subnet-${s.id}`, type: 'Network', label: s.name,
        sub: `${s.cidr} · ${s.type}`, view: 'networks' as View,
      }))
  )

  return results.slice(0, MAX_TOTAL)
}