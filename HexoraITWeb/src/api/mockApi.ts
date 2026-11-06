import { ApiError } from "./errors"
import { MODULE_ID, RESOURCES } from "../lib/permissions"
import { DEMO_ACCOUNTS, DEMO_STORAGE_KEY } from "../demo"

const TOKEN_KEY = "auth_token"
const ORG_ID = "10000000-0000-0000-0000-000000000001"
const ADMIN_ID = "20000000-0000-0000-0000-000000000001"
const USER_ID = "20000000-0000-0000-0000-000000000002"

type Entity = Record<string, unknown> & {
  id: string
  organizationId?: string
}
type DemoUser = Entity & {
  email: string
  password: string
  displayName: string
  systemRole: "User" | "Admin" | "Client"
  isBlocked: boolean
  createdAt: string
}
type Membership = {
  userId: string
  organizationId: string
  role: "ReadOnly" | "Member" | "Admin" | "Owner"
  customRoleId?: string
}
type ResourceName = "assets" | "passwords" | "subnets" | "licenses" | "contacts" | "contracts" | "plans" | "incidents" | "knowledge" | "projects" | "tasks" | "groups" | "warranties" | "folders" | "files"
type DemoState = {
  users: DemoUser[]
  organizations: Entity[]
  memberships: Membership[]
  deletedOrganizationIds: string[]
  resources: Record<ResourceName, Entity[]>
  roles: Entity[]
  diagrams: Record<string, { nodes: unknown[]; edges: unknown[] }>
  privateNotes?: Entity[]
  dashboards: Record<string, unknown>
  fileContents: Record<string, string>
}

const now = () => new Date().toISOString()
const id = () =>
  globalThis.crypto?.randomUUID?.() ??
  `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`

function allPermissions(canWrite = true) {
  return RESOURCES.map((resource) => ({
    resource,
    resourceId: MODULE_ID,
    canRead: true,
    canWrite,
  }))
}

function initialState(): DemoState {
  const createdAt = "2026-01-15T09:00:00.000Z"
  return {
    users: [
      {
        id: ADMIN_ID,
        email: DEMO_ACCOUNTS.admin.email,
        password: DEMO_ACCOUNTS.admin.password,
        displayName: "Demo Administrator",
        systemRole: "Admin",
        isBlocked: false,
        createdAt,
      },
      {
        id: USER_ID,
        email: DEMO_ACCOUNTS.user.email,
        password: DEMO_ACCOUNTS.user.password,
        displayName: "Demo User",
        systemRole: "User",
        isBlocked: false,
        createdAt,
      },
    ],
    organizations: [
      {
        id: ORG_ID,
        name: "HexoraIT Demo",
        color: "#2563eb",
        initials: "HD",
        description: "Public demo workspace stored only in this browser.",
      },
    ],
    memberships: [
      { userId: ADMIN_ID, organizationId: ORG_ID, role: "Owner" },
      { userId: USER_ID, organizationId: ORG_ID, role: "Member" },
    ],
    deletedOrganizationIds: [],
    resources: {
      assets: [
        {
          id: "a1",
          organizationId: ORG_ID,
          name: "HV-01",
          type: "Server",
          status: "online",
          location: "Server room",
          owner: "Infrastructure",
          ip: "10.20.0.10",
          updatedAt: createdAt,
          starred: true,
          tags: ["production", "hypervisor"],
          notes: "Demo virtualization host",
          serial: "DEMO-HV01",
        },
        {
          id: "a2",
          organizationId: ORG_ID,
          name: "FW-EDGE",
          type: "Network",
          status: "online",
          location: "Server room",
          owner: "Network",
          ip: "10.20.0.1",
          updatedAt: createdAt,
          starred: false,
          tags: ["firewall"],
          notes: "Demo edge firewall",
        },
      ],
      passwords: [
        {
          id: "p1",
          organizationId: ORG_ID,
          name: "Demo switch",
          username: "administrator",
          password: "demo-only-password",
          category: "Network",
          tags: ["demo"],
          updatedAt: createdAt,
          strength: "strong",
          starred: false,
          notes: "Not a real credential.",
        },
      ],
      subnets: [
        {
          id: "n1",
          organizationId: ORG_ID,
          name: "Servers",
          cidr: "10.20.0.0/24",
          vlan: 20,
          type: "LAN",
          gateway: "10.20.0.1",
          dns: "10.20.0.2",
          description: "Demo server network",
          ips: [
            {
              id: "ip1",
              ip: "10.20.0.10",
              label: "HV-01",
              status: "used",
              assetId: "a1",
              notes: "",
            },
          ],
        },
      ],
      licenses: [
        {
          id: "l1",
          organizationId: ORG_ID,
          name: "Endpoint Protection",
          vendor: "Demo Vendor",
          category: "Security",
          type: "Subscription",
          seats: 50,
          seatsUsed: 34,
          purchaseDate: "2026-01-01",
          expiryDate: "2027-01-01",
          cost: 2400,
          currency: "PLN",
          licenseKey: "DEMO-NOT-A-REAL-KEY",
          notes: "",
          starred: true,
          status: "active",
        },
      ],
      contacts: [
        {
          id: "c1",
          organizationId: ORG_ID,
          name: "Anna Nowak",
          company: "Demo Support",
          role: "Account manager",
          phone: "+48 000 000 000",
          email: "anna@example.invalid",
          description: "Demonstration contact",
          tags: ["support"],
          starred: false,
        },
      ],
      contracts: [
        {
          id: "co1",
          organizationId: ORG_ID,
          name: "Infrastructure support",
          vendor: "Demo Support",
          category: "Support",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          value: 12000,
          currency: "PLN",
          autoRenew: false,
          notes: "",
          starred: false,
          status: "active",
        },
      ],
      plans: [
        {
          id: "pl1",
          organizationId: ORG_ID,
          title: "Upgrade access switches",
          description: "Demonstration modernization plan",
          priority: "medium",
          status: "planned",
          targetDate: "2026-11-30",
          tags: ["network"],
          assetIds: ["a2"],
          estimatedCost: 18000,
          createdAt,
        },
      ],
      incidents: [
        {
          id: "i1",
          organizationId: ORG_ID,
          title: "Intermittent Wi-Fi",
          severity: "low",
          status: "investigating",
          description: "Demo incident for application preview.",
          resolution: "",
          affectedSystems: ["Guest Wi-Fi"],
          occurredAt: createdAt,
          resolvedAt: null,
          tags: ["demo"],
        },
      ],
      knowledge: [
        {
          id: "k1",
          organizationId: ORG_ID,
          title: "Demo onboarding checklist",
          category: "Procedures",
          content:
            "This article is sample content. Changes are saved in your browser only.",
          tags: ["onboarding"],
          updatedAt: createdAt,
          starred: true,
        },
      ],
      projects: [
        {
          id: "pr1",
          organizationId: ORG_ID,
          name: "Office refresh",
          description: "Demo infrastructure refresh project",
          color: "#7c3aed",
          createdAt,
          taskCount: 1,
        },
      ],
      tasks: [
        {
          id: "t1",
          organizationId: ORG_ID,
          title: "Inventory network cabinet",
          description: "Verify demo assets",
          priority: "medium",
          status: "in-progress",
          assignee: "Demo User",
          dueDate: "2026-10-15",
          tags: ["inventory"],
          createdAt,
          createdByUserId: ADMIN_ID,
          createdByName: "Demo Administrator",
          projectId: "pr1",
        },
      ],
      groups: [
        {
          id: "g1",
          organizationId: ORG_ID,
          name: "IT Administrators",
          type: "AD Security",
          description: "Demo privileged group",
          purpose: "Administration",
          members: ["Demo Administrator"],
          linkedAssets: ["a1"],
          tags: ["privileged"],
          createdAt,
        },
      ],
      warranties: [
        {
          id: "w1",
          organizationId: ORG_ID,
          name: "HV-01",
          vendor: "Demo Hardware",
          serialNumber: "DEMO-HV01",
          purchaseDate: "2026-01-01",
          warrantyEndDate: "2029-01-01",
          warrantyType: "On-Site NBD",
          contactName: "Demo Support",
          contactPhone: "+48 000 000 000",
          contactEmail: "support@example.invalid",
          notes: "",
          assetId: "a1",
          starred: false,
          status: "active",
        },
      ],
      folders: [
        { id: "f1", organizationId: ORG_ID, name: "Procedures", createdAt },
      ],
      files: [],
    },
    roles: [],
    diagrams: {
      [ORG_ID]: {
        nodes: [
          {
            id: "dn1",
            deviceType: "firewall",
            label: "FW-EDGE",
            ip: "10.20.0.1",
            assetId: "a2",
            x: 100,
            y: 140,
          },
          {
            id: "dn2",
            deviceType: "server",
            label: "HV-01",
            ip: "10.20.0.10",
            assetId: "a1",
            x: 360,
            y: 140,
          },
        ],
        edges: [
          {
            id: "de1",
            source: "dn1",
            target: "dn2",
            label: "VLAN 20",
            connectionType: "ethernet",
          },
        ],
      },
    },
    dashboards: {},
    fileContents: {},
  }
}

function readState(): DemoState {
  try {
    const value = localStorage.getItem(DEMO_STORAGE_KEY)
    if (value) return JSON.parse(value) as DemoState
  } catch {
    /* Fall back to a fresh in-memory-compatible state. */
  }
  const state = initialState()
  writeState(state)
  return state
}

function writeState(state: DemoState) {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state))
  } catch {
    throw new ApiError(
      507,
      "Demo storage is full or unavailable. Reset the demo and try again.",
    )
  }
}

function actor(state: DemoState): DemoUser {
  let token: string | null = null
  try {
    token = localStorage.getItem(TOKEN_KEY)
  } catch {
    /* handled below */
  }
  const user = token?.startsWith("demo:")
    ? state.users.find((item) => item.id === token.slice(5))
    : undefined
  if (!user || user.isBlocked)
    throw new ApiError(401, "Demo session expired. Please sign in again.")
  return user
}

function publicUser(user: DemoUser) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    systemRole: user.systemRole,
  }
}

function authResponse(state: DemoState, user: DemoUser) {
  return {
    token: `demo:${user.id}`,
    expiresAt: "2099-12-31T23:59:59.000Z",
    user: publicUser(user),
    organizations: state.memberships
      .filter((m) => m.userId === user.id)
      .map((m) => {
        const organization = state.organizations.find(
          (o) => o.id === m.organizationId,
        )!
        return { id: organization.id, name: organization.name, role: m.role }
      }),
  }
}

function parseBody(body: unknown): Record<string, unknown> {
  if (typeof body === "string" && body)
    return JSON.parse(body) as Record<string, unknown>
  return (body ?? {}) as Record<string, unknown>
}

function organizationId(url: URL) {
  const value = url.searchParams.get("organizationId")
  if (!value) throw new ApiError(400, "Organization is required.")
  return value
}

function ensureAdmin(user: DemoUser) {
  if (user.systemRole !== "Admin")
    throw new ApiError(403, "Administrator access is required.")
}

function entityStatus(collection: string, item: Entity): Entity {
  if (collection === "plans") return { ...item, subnetIds: item.subnetIds ?? [] }
  const today = new Date().toISOString().slice(0, 10)
  if (collection === "licenses")
    return {
      ...item,
      status: String(item.expiryDate) < today ? "expired" : "active",
    }
  if (collection === "contracts")
    return {
      ...item,
      status: String(item.endDate) < today ? "expired" : "active",
    }
  if (collection === "warranties")
    return {
      ...item,
      status: String(item.warrantyEndDate) < today ? "expired" : "active",
    }
  return item
}

function memberDto(state: DemoState, membership: Membership) {
  const user = state.users.find((u) => u.id === membership.userId)!
  const role = membership.customRoleId
    ? state.roles.find((r) => r.id === membership.customRoleId)
    : undefined
  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    role: membership.role,
    customRoleId: membership.customRoleId,
    customRoleName: role?.name,
    systemRole: user.systemRole,
  }
}

function demoPermission(state: DemoState, user: DemoUser, orgId: string, resource: string, write = false, resourceId = MODULE_ID) {
  if (state.deletedOrganizationIds.includes(orgId)) return false
  const member = state.memberships.find(m => m.userId === user.id && m.organizationId === orgId)
  if (!member || user.systemRole === 'Client') return false
  if (!member.customRoleId) return !write || member.role !== 'ReadOnly'
  const rules = (state.roles.find(role => role.id === member.customRoleId)?.permissions ?? []) as { resource: string; resourceId: string; canRead: boolean; canWrite: boolean }[]
  const rule = rules.find(rule => rule.resource === resource && rule.resourceId === resourceId) ?? rules.find(rule => rule.resource === resource && rule.resourceId === MODULE_ID)
  return !!rule?.canRead && (!write || rule.canWrite)
}
function compareDemoOrder(a: Entity, b: Entity) {
  return Number(a.sortIndex ?? Number.MAX_SAFE_INTEGER) - Number(b.sortIndex ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id)
}
// Numeric address parsing for the browser-only demo. Production uses IPAddress and transactional EF updates.
function demoAddress(value: string): { value: bigint; bits: number } | undefined {
  const input = value.trim().toLowerCase()
  if (!input.includes(':')) {
    const parts = input.split('.')
    if (parts.length !== 4 || parts.some(part => !/^(0|[1-9]\d{0,2})$/.test(part) || Number(part) > 255)) return
    return { value: parts.reduce((sum, part) => sum * 256n + BigInt(part), 0n), bits: 32 }
  }
  if (input.includes('%') || !/^[0-9a-f:]+$/.test(input) || input.split('::').length > 2) return
  const halves = input.split('::'), left = halves[0] ? halves[0].split(':') : [], right = halves[1] ? halves[1].split(':') : []
  const missing = 8 - left.length - right.length
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return
  const words = [...left, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...right]
  if (words.length !== 8 || words.some(word => !/^[0-9a-f]{1,4}$/.test(word))) return
  return { value: words.reduce((sum, word) => sum * 65536n + BigInt('0x' + word), 0n), bits: 128 }
}

async function dataUrl(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:${file.type || "application/octet-stream"};base64,${btoa(binary)}`
}

function dataUrlBlob(value?: string): Blob {
  if (!value)
    return new Blob(["Demo file content is not available."], {
      type: "text/plain",
    })
  const [header = "", encoded = ""] = value.split(",")
  const mimeType =
    header.match(/^data:(.*?);/)?.[1] ?? "application/octet-stream"
  const binary = atob(encoded)
  return new Blob([Uint8Array.from(binary, (char) => char.charCodeAt(0))], {
    type: mimeType,
  })
}

async function request<T>(
  method: string,
  path: string,
  rawBody?: unknown,
  responseType: "json" | "text" | "blob" = "json",
): Promise<T> {
  await Promise.resolve()
  const url = new URL(path, "https://demo.local")
  const route = url.pathname
  const body = parseBody(rawBody)
  const state = readState()

  if (route === "/auth/login" && method === "POST") {
    const email = String(body.email ?? "").toLowerCase()
    const user = state.users.find(
      (item) =>
        item.email.toLowerCase() === email && item.password === body.password,
    )
    if (!user || user.isBlocked)
      throw new ApiError(401, "Invalid demo email or password.")
    return authResponse(state, user) as T
  }
  if (route === "/auth/register")
    throw new ApiError(
      403,
      "Account registration is disabled in the public demo.",
    )

  const user = actor(state)
  if (route === "/auth/me" && method === "GET") return publicUser(user) as T
  if (route === "/auth/me" && method === "PUT") {
    user.displayName = String(body.displayName ?? user.displayName)
    writeState(state)
    return undefined as T
  }
  if (route === "/auth/change-password" && method === "POST") {
    if (user.password !== body.currentPassword)
      throw new ApiError(400, "Current password is incorrect.")
    user.password = String(body.newPassword)
    writeState(state)
    return undefined as T
  }
  if (route === "/version" || route === "/version/latest") return "demo" as T

  if (route === "/admin/users" && method === "GET") {
    ensureAdmin(user)
    return state.users.map((item) => ({
      id: item.id,
      email: item.email,
      displayName: item.displayName,
      systemRole: item.systemRole,
      isBlocked: item.isBlocked,
      createdAt: item.createdAt,
    })) as T
  }
  if (route === "/admin/users" && method === "POST") {
    ensureAdmin(user)
    if (
      state.users.some(
        (item) => item.email.toLowerCase() === String(body.email).toLowerCase(),
      )
    )
      throw new ApiError(409, "A user with this email already exists.")
    const created = {
      id: id(),
      email: String(body.email),
      password: String(body.password),
      displayName: String(body.displayName),
      systemRole: body.systemRole as DemoUser["systemRole"],
      isBlocked: false,
      createdAt: now(),
    } as DemoUser
    state.users.push(created)
    writeState(state)
    return {
      id: created.id,
      email: created.email,
      displayName: created.displayName,
      systemRole: created.systemRole,
      isBlocked: created.isBlocked,
      createdAt: created.createdAt,
    } as T
  }
  const adminMatch = route.match(
    /^\/admin\/users\/([^/]+)\/(block|role|reset-password)$/,
  )
  if (adminMatch) {
    ensureAdmin(user)
    const target = state.users.find((item) => item.id === adminMatch[1])
    if (!target) throw new ApiError(404, "User not found.")
    if (adminMatch[2] === "block")
      target.isBlocked = url.searchParams.get("blocked") === "true"
    if (adminMatch[2] === "role")
      target.systemRole = (body.systemRole as DemoUser["systemRole"])
    if (adminMatch[2] === "reset-password")
      target.password = String(body.newPassword)
    writeState(state)
    return undefined as T
  }

  if (route === "/organizations" && method === "GET") {
    return state.memberships
      .filter(
        (m) =>
          m.userId === user.id &&
          !state.deletedOrganizationIds.includes(m.organizationId),
      )
      .map((m) => {
        const org = state.organizations.find((o) => o.id === m.organizationId)!
        return { ...org, isTemporary: org.isTemporary ?? false, isArchived: org.isArchived ?? false, archivedAt: org.archivedAt ?? null, role: m.role }
      }) as T
  }
  if (route === "/organizations/deleted" && method === "GET") {
    return state.memberships
      .filter(
        (m) =>
          m.userId === user.id &&
          state.deletedOrganizationIds.includes(m.organizationId),
      )
      .map((m) => {
        const org = state.organizations.find((o) => o.id === m.organizationId)!
        return { ...org, isTemporary: org.isTemporary ?? false, isArchived: org.isArchived ?? false, archivedAt: org.archivedAt ?? null, role: m.role }
      }) as T
  }
  if (route === "/organizations" && method === "POST") {
    const temporary = body.isTemporary === true
    const defaultHidden = temporary ? RESOURCES.filter(resource => !['dashboard', 'settings', 'assets', 'passwords', 'contacts', 'contracts', 'knowledge', 'files'].includes(resource)) : []
    const hiddenModules = body.hiddenModules ?? defaultHidden
    if (!Array.isArray(hiddenModules) || hiddenModules.some(module => !RESOURCES.includes(module) || ['dashboard', 'settings'].includes(module))) throw new ApiError(400, "Invalid organization modules.")
    const created = { ...body, id: id(), isTemporary: temporary, isArchived: false, archivedAt: null, hiddenModules } as Entity
    state.organizations.push(created)
    state.memberships.push({
      userId: user.id,
      organizationId: created.id,
      role: "Owner",
    })
    writeState(state)
    return created as T
  }

  const orgMatch = route.match(/^\/organizations\/([^/]+)(?:\/(.*))?$/)
  if (orgMatch) {
    const orgId = orgMatch[1]!
    const tail = orgMatch[2] ?? ""
    const org = state.organizations.find((item) => item.id === orgId)
    if (!org) throw new ApiError(404, "Organization not found.")
    if ((tail === "archive" || tail === "unarchive") && method === "POST") {
      const member = state.memberships.find(m => m.organizationId === orgId && m.userId === user.id)
      if (!member || !["Owner", "Admin"].includes(member.role) || member.customRoleId || user.systemRole === "Client" || state.deletedOrganizationIds.includes(orgId)) throw new ApiError(403, "Access forbidden.")
      org.isArchived = tail === "archive"
      org.archivedAt = org.isArchived ? now() : null
      writeState(state)
      return undefined as T
    }
    const noteMatch = tail.match(/^private-notes(?:\/([^/]+))?$/)
    if (noteMatch) {
      const membership = state.memberships.find(member => member.userId === user.id && member.organizationId === orgId)
      if (!membership || user.systemRole === 'Client' || state.deletedOrganizationIds.includes(orgId)) throw new ApiError(403, 'Access forbidden.')
      state.privateNotes ??= []
      const own = state.privateNotes.filter(note => note.organizationId === orgId && note.userId === user.id)
      const noteId = noteMatch[1], note = own.find(note => note.id === noteId)
      if (method === 'GET' && !noteId) return own.sort(compareDemoOrder) as T
      if (noteId && !note) throw new ApiError(404, 'Note not found.')
      if (method === 'POST' || method === 'PUT') {
        if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200 || typeof body.content !== 'string' || body.content.length > 100000) throw new ApiError(400, 'Invalid note.')
        if (note) Object.assign(note, { title: body.title.trim(), content: body.content, updatedAt: now() })
        else { const created = { id: id(), organizationId: orgId, userId: user.id, title: body.title.trim(), content: body.content, updatedAt: now() }; state.privateNotes.push(created); writeState(state); return created as T }
        writeState(state); return note as T
      }
      if (method === 'DELETE' && note) { state.privateNotes = state.privateNotes.filter(item => item !== note); writeState(state); return undefined as T }
    }
    if (tail.startsWith('record-order/')) {
      const resource = tail.slice('record-order/'.length)
      const permission = resource === 'folders' ? 'files' : resource === 'ip-entries' ? 'networks' : resource
      const personal = resource === 'private-notes' && user.systemRole !== 'Client' && state.memberships.some(m => m.userId === user.id && m.organizationId === orgId) && !state.deletedOrganizationIds.includes(orgId)
      if (!personal && !demoPermission(state, user, orgId, permission)) throw new ApiError(403, 'Access forbidden.')
      const collection = resource === 'networks' ? 'subnets' : resource === 'warranty' ? 'warranties' : resource
      let records: { entity: Entity; parentId?: string }[]
      if (resource === 'ip-entries') records = state.resources.subnets.filter(x => x.organizationId === orgId).flatMap(subnet => ((subnet.ips ?? []) as Entity[]).map(entity => ({ entity, parentId: subnet.id })))
      else if (resource === 'diagram') records = ((state.diagrams[orgId]?.nodes ?? []) as Entity[]).map(entity => ({ entity }))
      else if (resource === 'private-notes') records = (state.privateNotes ?? []).filter(note => note.organizationId === orgId && note.userId === user.id).map(entity => ({ entity }))
      else if (collection in state.resources) records = state.resources[collection as ResourceName].filter(x => x.organizationId === orgId).map(entity => ({ entity, parentId: (entity.folderId ?? entity.parentFolderId) as string | undefined }))
      else throw new ApiError(400, 'Unknown record section.')
      records = records.filter(row => personal || demoPermission(state, user, orgId, permission, false, resource === 'ip-entries' ? row.parentId : resource === 'diagram' ? MODULE_ID : row.entity.id))
      if (method === 'GET') {
        const search = (url.searchParams.get('search') ?? '').toLowerCase(), parent = url.searchParams.get('parentId')
        const page = Math.max(1, Number(url.searchParams.get('page') ?? 1)), size = Math.min(200, Math.max(1, Number(url.searchParams.get('pageSize') ?? 200)))
        return records.filter(row => (!parent || row.parentId === parent) && String(row.entity.name ?? row.entity.title ?? row.entity.label ?? row.entity.ip ?? '').toLowerCase().includes(search))
          .sort((a, b) => compareDemoOrder(a.entity, b.entity)).slice((page - 1) * size, page * size).map(row => ({ id: row.entity.id, name: String(row.entity.name ?? row.entity.title ?? row.entity.label ?? row.entity.ip ?? ''), sortIndex: row.entity.sortIndex ?? null,
            canWrite: personal || demoPermission(state, user, orgId, permission, true, resource === 'ip-entries' ? row.parentId : resource === 'diagram' ? MODULE_ID : row.entity.id) })) as T
      }
      if (method === 'PATCH') {
        const changes = body.changes as { id: string; sortIndex: number | null }[]
        if (!Array.isArray(changes) || !changes.length || changes.length > 500 || new Set(changes.map(x => x?.id)).size !== changes.length || changes.some(x => !x || !x.id || (x.sortIndex !== null && (!Number.isInteger(x.sortIndex) || x.sortIndex < 1 || x.sortIndex > 1_000_000)))) throw new ApiError(400, 'Invalid record indices.')
        const selected = changes.map(change => ({ change, row: records.find(row => row.entity.id === change.id) }))
        if (selected.some(x => !x.row)) throw new ApiError(400, 'Some records are unavailable in this organization.')
        if (!personal && selected.some(({ row }) => !demoPermission(state, user, orgId, permission, true, resource === 'ip-entries' ? row!.parentId : resource === 'diagram' ? MODULE_ID : row!.entity.id))) throw new ApiError(403, 'Access forbidden.')
        for (const { change, row } of selected) row!.entity.sortIndex = change.sortIndex
        writeState(state)
        return changes as T
      }
    }
    if (tail.startsWith("documentation/")) {
      const member = state.memberships.find(m => m.organizationId === orgId && m.userId === user.id)
      if (!member || !["Owner", "Admin"].includes(member.role) || member.customRoleId || user.systemRole === "Client") throw new ApiError(403, "Access forbidden.")
      const keys = [...RESOURCES.filter(key => !["dashboard", "settings"].includes(key)), "private-notes"]
      const records = (key: string): Entity[] => {
        if (key === "private-notes" || key === "diagram") return []
        const resource = key === "networks" ? "subnets" : key === "warranty" ? "warranties" : key
        return (state.resources[resource as ResourceName] ?? []).filter(item => item.organizationId === orgId)
      }
      if (tail === "documentation/options") return { sections: keys.map(key => ({ key, count: records(key).length,
        defaultSelected: ["assets", "networks", "licenses", "contacts", "contracts", "knowledge", "warranty", "files", "diagram"].includes(key) && !(org.hiddenModules as string[] | undefined)?.includes(key) && records(key).length > 0 })) } as T
      if (tail.startsWith("documentation/items/")) {
        const key = decodeURIComponent(tail.slice("documentation/items/".length))
        const search = (url.searchParams.get("search") ?? "").toLowerCase()
        const page = Number(url.searchParams.get("page") ?? "1")
        return records(key).sort(compareDemoOrder).map(item => ({ id: item.id, name: String(item.name ?? item.title ?? "") })).filter(item => item.name.toLowerCase().includes(search))
          .slice((page - 1) * 200, page * 200) as T
      }
      throw new ApiError(501, "Connect the API to generate documentation PDFs. The demo supports selection and review only.")
    }
    if (tail === "customization") {
      const member = state.memberships.find(m => m.organizationId === orgId && m.userId === user.id)
      if (!member) throw new ApiError(403, "Access forbidden.")
      if (method === "GET") return { hiddenModules: org.hiddenModules ?? [] } as T
      if (method === "PUT") {
        if (!["Owner", "Admin"].includes(member.role)) throw new ApiError(403, "Access forbidden.")
        org.hiddenModules = body.hiddenModules
        writeState(state)
        return undefined as T
      }
    }
    if (!tail && method === "GET") return org as T
    if (!tail && method === "PUT") {
      Object.assign(org, body)
      writeState(state)
      return undefined as T
    }
    if (!tail && method === "DELETE") {
      if (!state.deletedOrganizationIds.includes(orgId))
        state.deletedOrganizationIds.push(orgId)
      writeState(state)
      return undefined as T
    }
    if (tail === "restore" && method === "POST") {
      state.deletedOrganizationIds = state.deletedOrganizationIds.filter(
        (value) => value !== orgId,
      )
      writeState(state)
      return undefined as T
    }
    if (tail === "members" && method === "GET")
      return state.memberships
        .filter((m) => m.organizationId === orgId)
        .map((m) => memberDto(state, m)) as T
    if (tail === "members" && method === "POST") {
      let invited = state.users.find(
        (item) => item.email.toLowerCase() === String(body.email).toLowerCase(),
      )
      if (!invited) {
        invited = ({
          id: id(),
          email: String(body.email),
          password: "DemoInvite123!",
          displayName: String(body.email).split("@")[0],
          systemRole: "User",
          isBlocked: false,
          createdAt: now(),
        } as DemoUser)
        state.users.push(invited)
      }
      const membership = {
        userId: invited.id,
        organizationId: orgId,
        role: body.role,
        customRoleId: body.customRoleId,
      } as Membership
      state.memberships.push(membership)
      writeState(state)
      return memberDto(state, membership) as T
    }
    const memberMatch = tail.match(/^members\/([^/]+)(?:\/role)?$/)
    if (memberMatch && method === "DELETE") {
      state.memberships = state.memberships.filter(
        (m) => !(m.organizationId === orgId && m.userId === memberMatch[1]),
      )
      writeState(state)
      return undefined as T
    }
    if (memberMatch && method === "PUT") {
      const membership = state.memberships.find(
        (m) => m.organizationId === orgId && m.userId === memberMatch[1],
      )
      if (!membership) throw new ApiError(404, "Member not found.")
      membership.role = (body.role as Membership["role"])
      membership.customRoleId = (body.customRoleId as string | undefined)
      writeState(state)
      return undefined as T
    }
    if (tail === "permissions" && method === "GET") {
      const membership = state.memberships.find(
        (m) => m.organizationId === orgId && m.userId === user.id,
      )
      if (!membership)
        throw new ApiError(403, "You do not have access to this organization.")
      const custom = membership.customRoleId
        ? state.roles.find((role) => role.id === membership.customRoleId)
        : undefined
      return {
        roleName: custom?.name ?? membership.role,
        canManageRoles: ["Owner", "Admin"].includes(membership.role),
        hiddenModules: org.hiddenModules ?? [],
        permissions:
          custom?.permissions ?? allPermissions(membership.role !== "ReadOnly"),
      } as T
    }
    if (tail === "roles" && method === "GET")
      return state.roles.filter((role) => role.organizationId === orgId) as T
    if (tail === "roles" && method === "POST") {
      const created = { ...body, id: id(), organizationId: orgId } as Entity
      state.roles.push(created)
      writeState(state)
      return created as T
    }
    const roleMatch = tail.match(/^roles\/([^/]+)(?:\/copy)?$/)
    if (roleMatch && tail.endsWith("/copy") && method === "POST") {
      const source = state.roles.find((role) => role.id === roleMatch[1])
      if (!source) throw new ApiError(404, "Role not found.")
      for (const targetOrgId of body.organizationIds as string[])
        state.roles.push({
          ...structuredClone(source),
          id: id(),
          organizationId: targetOrgId,
        })
      writeState(state)
      return undefined as T
    }
    if (roleMatch && method === "PUT") {
      const role = state.roles.find((item) => item.id === roleMatch[1])
      if (!role) throw new ApiError(404, "Role not found.")
      Object.assign(role, body)
      writeState(state)
      return undefined as T
    }
    if (roleMatch && method === "DELETE") {
      state.roles = state.roles.filter((item) => item.id !== roleMatch[1])
      writeState(state)
      return undefined as T
    }
    const resourceMatch = tail.match(/^role-resources\/(.+)$/)
    if (resourceMatch && method === "GET") {
      const requested = resourceMatch[1]!
      const collection = (
        requested === "networks"
          ? "subnets"
          : requested === "warranty"
            ? "warranties"
            : requested
      ) as ResourceName
      return state.resources[collection]
        .filter((item) => item.organizationId === orgId)
        .map((item) => ({ id: item.id, name: item.name ?? item.title })) as T
    }
    if (tail === "clients" && method === "POST") {
      const client = {
        id: id(),
        email: String(body.email),
        password: String(body.password),
        displayName: String(body.displayName),
        systemRole: "Client",
        isBlocked: false,
        createdAt: now(),
      } as DemoUser
      state.users.push(client)
      state.memberships.push({
        userId: client.id,
        organizationId: orgId,
        role: "ReadOnly",
      })
      writeState(state)
      return publicUser(client) as T
    }
    const clientPermissions = tail.match(/^clients\/([^/]+)\/permissions$/)
    if (clientPermissions && method === "GET") {
      const membership = state.memberships.find(
        (m) => m.organizationId === orgId && m.userId === clientPermissions[1],
      )
      const custom = state.roles.find(
        (role) => role.id === membership?.customRoleId,
      )
      return (custom?.permissions ?? allPermissions(false)) as T
    }
    if (clientPermissions && method === "PUT") {
      const created = { ...body, id: id(), organizationId: orgId } as Entity
      state.roles.push(created)
      const membership = state.memberships.find(
        (m) => m.organizationId === orgId && m.userId === clientPermissions[1],
      )
      if (membership) membership.customRoleId = created.id
      writeState(state)
      return undefined as T
    }
  }

  if (route === "/dashboard-layout") {
    const orgId = organizationId(url)
    if (method === "GET") return (state.dashboards[orgId] ?? null) as T
    if (method === "PUT") state.dashboards[orgId] = body
    if (method === "DELETE") delete state.dashboards[orgId]
    writeState(state)
    return undefined as T
  }
  if (route === "/diagram") {
    const orgId = organizationId(url)
    if (method === "GET")
      return (state.diagrams[orgId] ?? { nodes: [], edges: [] }) as T
    state.diagrams[orgId] = body as { nodes: unknown[]; edges: unknown[] }
    writeState(state)
    return undefined as T
  }

  if (route === "/files/folders" && method === "GET") {
    const orgId = organizationId(url)
    const parentFolderId = url.searchParams.get("parentFolderId") ?? undefined
    return (state.resources.folders ?? []).filter(
      (item) =>
        item.organizationId === orgId && item.parentFolderId === parentFolderId,
    ) as T
  }
  if (route === "/files/folders" && method === "POST") {
    const created = {
      id: id(),
      organizationId: organizationId(url),
      name: body.name,
      parentFolderId: body.parentFolderId,
      createdAt: now(),
    } as Entity
    state.resources.folders.push(created)
    writeState(state)
    return created as T
  }
  if (route === "/files" && method === "GET") {
    const orgId = organizationId(url)
    const folderId = url.searchParams.get("folderId") ?? undefined
    return (state.resources.files ?? []).filter(
      (item) => item.organizationId === orgId && item.folderId === folderId,
    ) as T
  }
  const folderMatch = route.match(/^\/files\/folders\/([^/]+)(?:\/(move))?$/)
  if (folderMatch) {
    const folder = state.resources.folders.find(
      (item) => item.id === folderMatch[1],
    )
    if (method === "DELETE")
      state.resources.folders = state.resources.folders.filter(
        (item) => item.id !== folderMatch[1],
      )
    else if (folder) {
      if (folderMatch[2]) folder.parentFolderId = body.newParentFolderId
      else folder.name = body.name
    }
    writeState(state)
    return undefined as T
  }
  const fileMatch = route.match(
    /^\/files\/([^/]+)(?:\/(content|download|move))?$/,
  )
  if (fileMatch) {
    const fileId = fileMatch[1]!
    const file = state.resources.files.find((item) => item.id === fileId)
    if (
      (fileMatch[2] === "content" || fileMatch[2] === "download") &&
      responseType === "blob"
    )
      return dataUrlBlob(state.fileContents[fileId]) as T
    if (method === "DELETE") {
      state.resources.files = state.resources.files.filter(
        (item) => item.id !== fileId,
      )
      delete state.fileContents[fileId]
    } else if (file) {
      if (fileMatch[2] === "move") file.folderId = body.newFolderId
      else file.name = body.name
    }
    writeState(state)
    return undefined as T
  }

  const taskStatus = route.match(/^\/tasks\/([^/]+)\/status$/)
  if (taskStatus && method === 'PATCH') {
    const task = state.resources.tasks.find(task => task.id === taskStatus[1])
    if (!task || !demoPermission(state, user, String(task.organizationId), 'tasks', false, task.id)) throw new ApiError(404, 'Task not found.')
    if (!demoPermission(state, user, String(task.organizationId), 'tasks', true, task.id)) throw new ApiError(403, 'Access forbidden.')
    if (!['todo', 'in-progress', 'done'].includes(String(body.status))) throw new ApiError(400, 'Invalid status.')
    task.status = body.status
    writeState(state)
    return { status: task.status } as T
  }
  const revealMatch = route.match(/^\/passwords\/([^/]+)\/reveal$/)
  if (revealMatch && method === "GET") {
    const password = state.resources.passwords.find(
      (item) => item.id === revealMatch[1],
    )?.password
    return String(password ?? "") as T
  }
  if (route === '/subnets/sync-assets' && method === 'POST') {
    const orgId = organizationId(url)
    if (!demoPermission(state, user, orgId, 'assets') || !demoPermission(state, user, orgId, 'networks')) throw new ApiError(403, 'Access forbidden.')
    const subnets = state.resources.subnets.filter(x => x.organizationId === orgId && demoPermission(state, user, orgId, 'networks', false, x.id))
    if (!subnets.some(x => demoPermission(state, user, orgId, 'networks', true, x.id))) throw new ApiError(403, 'Access forbidden.')
    const result = { added: 0, updated: 0, unchanged: 0, skipped: 0, issueCount: 0, issues: [] as { assetId: string | null; name: string; ip: string; reason: string }[] }
    const issue = (entity: Entity, reason: string, subnet = false) => { result.issueCount++; if (result.issues.length < 50) result.issues.push({ assetId: subnet ? null : entity.id, name: String(entity.name ?? ''), ip: String(subnet ? entity.cidr : entity.ip ?? ''), reason }) }
    const ranges = subnets.flatMap(subnet => {
      const [ip, mask, extra] = String(subnet.cidr ?? '').split('/'), address = demoAddress(ip ?? ''), prefix = Number(mask)
      if (!address || mask === undefined || !/^\d+$/.test(mask) || extra !== undefined || prefix < 0 || prefix > address.bits) { issue(subnet, 'invalid-subnet', true); return [] }
      return [{ subnet, address, prefix }]
    })
    const entries = subnets.flatMap(subnet => ((subnet.ips ?? []) as Entity[]).map(entry => ({ subnet, entry })))
    const addressKey = (value: unknown) => { const address = demoAddress(String(value ?? '')); return address ? address.bits + ':' + address.value : '' }
    const plans = state.resources.assets.filter(x => x.organizationId === orgId && demoPermission(state, user, orgId, 'assets', false, x.id)).flatMap(asset => {
      if (entries.some(x => x.entry.assetId === asset.id && !x.entry.isAutoManaged)) { result.unchanged++; return [] }
      const address = demoAddress(String(asset.ip ?? ''))
      if (!address) { result.skipped++; issue(asset, 'invalid-address'); return [] }
      const matches = ranges.filter(range => range.address.bits === address.bits && range.address.value >> BigInt(address.bits - range.prefix) === address.value >> BigInt(address.bits - range.prefix)).sort((a, b) => b.prefix - a.prefix)
      const reason = !matches.length ? 'no-subnet' : matches.length > 1 && matches[0]!.prefix === matches[1]!.prefix ? 'ambiguous-subnet' : null
      if (reason) { result.skipped++; issue(asset, reason); return [] }
      const target = matches[0]!.subnet, existing = entries.find(x => x.entry.assetId === asset.id && x.entry.isAutoManaged)
      if (!demoPermission(state, user, orgId, 'networks', true, target.id) || (existing && !demoPermission(state, user, orgId, 'networks', true, existing.subnet.id))) { result.skipped++; issue(asset, 'write-denied'); return [] }
      return [{ asset, target, existing, key: addressKey(asset.ip) }]
    })
    const rejected = new Map<string, string>()
    for (const plan of plans) if (plans.filter(x => x.target.id === plan.target.id && x.key === plan.key).length > 1) rejected.set(plan.asset.id, 'duplicate-asset-address')
    let changed: boolean
    do {
      changed = false
      for (const plan of plans.filter(x => !rejected.has(x.asset.id))) {
        const conflict = entries.find(x => {
          if (x.subnet.id !== plan.target.id || addressKey(x.entry.ip) !== plan.key || x.entry.id === plan.existing?.entry.id) return false
          const move = x.entry.isAutoManaged && plans.find(other => other.asset.id === x.entry.assetId && !rejected.has(other.asset.id) && (other.target.id !== x.subnet.id || other.key !== addressKey(x.entry.ip)))
          return !move
        })
        if (conflict) { rejected.set(plan.asset.id, conflict.entry.isAutoManaged ? 'address-conflict' : 'manual-address-conflict'); changed = true }
      }
    } while (changed)
    for (const plan of plans) {
      const reason = rejected.get(plan.asset.id)
      if (reason) { result.skipped++; issue(plan.asset, reason); continue }
      if (plan.existing) {
        const { entry, subnet } = plan.existing
        if (subnet.id === plan.target.id && addressKey(entry.ip) === plan.key && entry.label === plan.asset.name && entry.status === 'used') { result.unchanged++; continue }
        if (subnet.id !== plan.target.id) { subnet.ips = (subnet.ips as Entity[]).filter(x => x.id !== entry.id); (plan.target.ips as Entity[]).push(entry) }
        Object.assign(entry, { ip: plan.asset.ip, label: plan.asset.name, status: 'used' }); result.updated++
      } else { (plan.target.ips as Entity[]).push({ id: id(), ip: plan.asset.ip, label: plan.asset.name, assetId: plan.asset.id, status: 'used', isAutoManaged: true, notes: '', plainText: '' }); result.added++ }
    }
    writeState(state)
    return result as T
  }
  const ipMatch = route.match(/^\/subnets\/([^/]+)\/ips(?:\/([^/]+))?$/)
  if (ipMatch) {
    const subnet = state.resources.subnets.find(
      (item) => item.id === ipMatch[1],
    )
    if (!subnet) throw new ApiError(404, "Subnet not found.")
    const ips = subnet.ips as Entity[]
    if (method === "POST") {
      const created = { ...body, id: id() } as Entity
      ips.push(created)
      writeState(state)
      return created as T
    }
    if (method === "PUT") {
      const entry = ips.find((item) => item.id === ipMatch[2])
      if (entry) Object.assign(entry, body, { isAutoManaged: false })
      writeState(state)
      return undefined as T
    }
    if (method === "DELETE") {
      subnet.ips = ips.filter((item) => item.id !== ipMatch[2])
      writeState(state)
      return undefined as T
    }
  }

  const resourceMatch = route.match(
    /^\/(assets|passwords|subnets|licenses|contacts|contracts|plans|incidents|knowledge|projects|tasks|groups|warranties)(?:\/([^/]+))?(?:\/(star|document))?$/,
  )
  if (resourceMatch) {
    const collection = resourceMatch[1]! as ResourceName
    const entityId = resourceMatch[2]
    const action = resourceMatch[3]
    const items = state.resources[collection]
    if (!entityId && method === "GET") {
      const result = items
        .filter((item) => item.organizationId === organizationId(url))
        .map((item) => entityStatus(collection, item)).sort(compareDemoOrder)
      if (collection === "projects")
        for (const project of result)
          project.taskCount = state.resources.tasks.filter(
            (task) => task.projectId === project.id,
          ).length
      return result as T
    }
    if (!entityId && method === "POST") {
      const defaults =
        collection === "subnets"
          ? { ips: [] }
          : collection === "projects"
            ? { taskCount: 0 }
            : {}
      const created = entityStatus(collection, {
        ...defaults,
        ...body,
        id: id(),
        organizationId: organizationId(url),
        updatedAt: now(),
        createdAt: now(),
        strength: collection === "passwords" ? "strong" : body.strength,
      })
      items.push(created)
      writeState(state)
      if (collection === "passwords") {
        const { password: _password, ...publicEntry } = created
        void _password
        return publicEntry as T
      }
      return created as T
    }
    const item = items.find((value) => value.id === entityId)
    if (!item) throw new ApiError(404, "Demo item not found.")
    if (action === "star" && method === "PATCH") {
      item.starred = !item.starred
      writeState(state)
      return { starred: item.starred } as T
    }
    if (action === "document" && method === "GET" && responseType === "blob")
      return dataUrlBlob(state.fileContents[`document:${entityId}`]) as T
    if (!action && method === "PUT") {
      Object.assign(item, body, { updatedAt: now() })
      writeState(state)
      return undefined as T
    }
    if (!action && method === "DELETE") {
      state.resources[collection] = items.filter(
        (value) => value.id !== entityId,
      )
      if (collection === "projects") {
        for (const task of state.resources.tasks)
          if (task.projectId === entityId) task.projectId = undefined
      }
      writeState(state)
      return undefined as T
    }
  }

  throw new ApiError(
    501,
    `This operation is not available in demo mode: ${method} ${route}`,
  )
}

async function upload<T>(path: string, file: File): Promise<T> {
  const url = new URL(path, "https://demo.local")
  const state = readState()
  actor(state)
  if (url.pathname === "/files/upload") {
    const created = {
      id: id(),
      organizationId: organizationId(url),
      folderId: url.searchParams.get("folderId") ?? undefined,
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      uploadedAt: now(),
    } as Entity
    state.resources.files.push(created)
    state.fileContents[created.id] = await dataUrl(file)
    writeState(state)
    return created as T
  }
  const replacement = url.pathname.match(/^\/files\/([^/]+)\/replace$/)
  if (replacement) {
    const item = state.resources.files.find(value => value.id === replacement[1])
    if (!item) throw new ApiError(404, "File not found.")
    const content = await dataUrl(file)
    Object.assign(item, { name: file.name, mimeType: file.type || "application/octet-stream", size: file.size })
    state.fileContents[item.id] = content
    writeState(state)
    return item as T
  }
  const document = url.pathname.match(
    /^\/(contracts|warranties)\/([^/]+)\/document$/,
  )
  if (document) {
    const item = state.resources[(document[1]! as ResourceName)].find(
      (value) => value.id === document[2],
    )
    if (!item) throw new ApiError(404, "Demo item not found.")
    item.document = {
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    }
    state.fileContents[`document:${item.id}`] = await dataUrl(file)
    writeState(state)
    return item as T
  }
  throw new ApiError(
    501,
    `Upload is not available in demo mode: ${url.pathname}`,
  )
}

export const mockApi = { request, upload }
