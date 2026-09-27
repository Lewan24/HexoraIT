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
        return { id: org.id, name: org.name, role: m.role }
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
        return { id: org.id, name: org.name, role: m.role }
      }) as T
  }
  if (route === "/organizations" && method === "POST") {
    const created = { ...body, id: id() } as Entity
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

  const revealMatch = route.match(/^\/passwords\/([^/]+)\/reveal$/)
  if (revealMatch && method === "GET") {
    const password = state.resources.passwords.find(
      (item) => item.id === revealMatch[1],
    )?.password
    return String(password ?? "") as T
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
      if (entry) Object.assign(entry, body)
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
        .map((item) => entityStatus(collection, item))
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
