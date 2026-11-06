export type AssetType = 'Server' | 'Workstation' | 'Network' | 'Storage' | 'AP' | 'Printer' | 'Phone' | 'Camera' | 'Recorder'
export type AssetStatus = 'online' | 'offline' | 'maintenance' | 'unknown'
export type PasswordStrength = 'strong' | 'medium' | 'weak'
export type IPEntryStatus = 'used' | 'reserved' | 'free'
export type SubnetType = 'LAN' | 'DMZ' | 'WAN' | 'WLAN' | 'MGMT' | 'VPN'
export type LicenseType = 'Subscription' | 'Perpetual' | 'OEM' | 'Volume' | 'Trial'
export type LicenseCategory = 'Software' | 'OS' | 'Antivirus' | 'Domain' | 'Cloud' | 'Security' | 'Office' | 'Virtualization' | 'Backup' | 'Monitoring' | 'Other'
export type LicenseStatus = 'active' | 'expiring' | 'expired' | 'inactive'
export type ContractCategory = 'Service' | 'Support' | 'Maintenance' | 'Lease' | 'NDA' | 'SLA' | 'Software' | 'Other'
export type ContractStatus = 'active' | 'expiring' | 'expired' | 'draft'
export type Priority = 'high' | 'medium' | 'low'
export type PlanStatus = 'planned' | 'in-progress' | 'completed' | 'cancelled'
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low'
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed'
export type TaskStatus = 'todo' | 'in-progress' | 'done'
export type GroupType = 'AD Security' | 'AD Distribution' | 'AD OU' | 'Local Group' | 'VLAN Group' | 'Project Team' | 'Other'
export type WarrantyType = 'Standard' | 'Extended' | 'On-Site NBD' | 'Carry-In' | 'Mail-In' | 'Other'
export type WarrantyStatus = 'active' | 'expiring' | 'expired'
export type DiagramDeviceType = 'server' | 'firewall' | 'switch' | 'router' | 'workstation' | 'ap' | 'storage' | 'cloud' | 'internet' | 'printer' | 'custom'
export type DiagramConnectionType = 'ethernet' | 'fiber' | 'wireless' | 'vpn' | 'wan'
export type OrgRole = 'ReadOnly' | 'Member' | 'Admin' | 'Owner'
export type SystemRole = 'User' | 'Admin' | 'Client'

export interface AdminUser { id: string; email: string; displayName: string; systemRole: SystemRole; isBlocked: boolean; createdAt: string }

export interface OrganizationInput { name: string; color: string; initials: string; description: string }
export interface CreateOrganizationInput extends OrganizationInput { isTemporary?: boolean; hiddenModules?: string[] }
export interface Organization extends OrganizationInput { id: string; isTemporary: boolean; isArchived: boolean; archivedAt: string | null }
export interface OrganizationSummary { id: string; name: string; role: OrgRole }
export interface OrgMembership extends Organization { role: OrgRole }
export interface OrgMember { userId: string; email: string; displayName: string; role: OrgRole; customRoleId?: string; customRoleName?: string; systemRole?: SystemRole }

export interface ResourcePermission {
  resource: string
  resourceId: string
  canRead: boolean
  canWrite: boolean
}

export interface OrganizationRole {
  id: string
  name: string
  permissions: ResourcePermission[]
}

export interface OrganizationAccess {
  hiddenModules?: string[]
  roleName: string
  canManageRoles: boolean
  permissions: ResourcePermission[]
}

export interface DashboardLayout { maxItems?: number; sectionOrder: string[]; hiddenSections: string[] }

export interface OrderedRecord { id: string; sortIndex?: number | null }

export interface Asset extends OrderedRecord {
  id: string; name: string; type: AssetType; status: AssetStatus; location: string
  owner: string; ip: string; updatedAt: string; starred: boolean; tags: string[]; notes: string; serial?: string
}

export interface PasswordEntry extends OrderedRecord {
  id: string; name: string; username: string; category: string
  tags: string[]; updatedAt: string; strength: PasswordStrength; starred: boolean; notes: string
}

export interface IPEntry extends OrderedRecord { isAutoManaged?: boolean; id: string; ip: string; label: string; status: IPEntryStatus; assetId?: string; plainText?: string; notes: string }

export interface Subnet extends OrderedRecord {
  id: string; name: string; cidr: string; vlan?: number; type: SubnetType
  gateway: string; dns: string; description: string; ips: IPEntry[]
}

export interface License extends OrderedRecord {
  id: string; name: string; vendor: string; category: LicenseCategory; type: LicenseType
  seats: number; seatsUsed: number; purchaseDate: string; expiryDate: string
  cost: number; currency: string; licenseKey: string; notes: string; starred: boolean; status: LicenseStatus
}

export interface Contact extends OrderedRecord {
  id: string; name: string; company: string; role: string; phone: string
  email: string; description: string; tags: string[]; starred: boolean
}

export interface Contract extends OrderedRecord {
  id: string; name: string; vendor: string; category: ContractCategory
  startDate: string; endDate: string; value: number; currency: string
  autoRenew: boolean; notes: string; starred: boolean; status: ContractStatus
  document?: WarrantyDocument
}

export interface Plan extends OrderedRecord {
  id: string; title: string; description: string; priority: Priority
  status: PlanStatus; targetDate: string; tags: string[];
  assetIds: string[]; subnetIds?: string[]; estimatedCost: number; createdAt: string
}

export interface Incident extends OrderedRecord {
  id: string; title: string; severity: IncidentSeverity; status: IncidentStatus
  description: string; resolution: string; affectedSystems: string[]
  occurredAt: string; resolvedAt: string | null; tags: string[]
}

export interface KnowledgeArticle extends OrderedRecord {
  id: string; title: string; category: string; content: string
  tags: string[]; updatedAt: string; starred: boolean
}

export interface Project extends OrderedRecord { id: string; name: string; description: string; color: string; createdAt: string; taskCount: number }

export interface Task extends OrderedRecord {
  createdByUserId?: string; createdByName?: string
  id: string; title: string; description: string; priority: Priority
  status: TaskStatus; assignee: string; dueDate: string; tags: string[]; createdAt: string
  projectId?: string
}

export interface Group extends OrderedRecord {
  id: string; name: string; type: GroupType; description: string; purpose: string
  members: string[]; linkedAssets: string[]; tags: string[]; createdAt: string
}

export interface WarrantyDocument { name: string; mimeType: string; size: number }

export interface WarrantyItem extends OrderedRecord {
  id: string; name: string; vendor: string; serialNumber: string
  purchaseDate: string; warrantyEndDate: string; warrantyType: WarrantyType
  contactName: string; contactPhone: string; contactEmail: string
  notes: string; assetId?: string; document?: WarrantyDocument
  starred: boolean; status: WarrantyStatus
}

export interface DiagramNode extends OrderedRecord {
  id: string; deviceType: DiagramDeviceType; label: string; ip?: string
  assetId?: string; x: number; y: number; color?: string
}

export interface DiagramEdge {
  id: string; source: string; target: string
  label?: string; connectionType: DiagramConnectionType
}

export interface FileFolder extends OrderedRecord { id: string; name: string; parentFolderId?: string; createdAt: string }
export interface StoredFile extends OrderedRecord { id: string; name: string; mimeType: string; size: number; folderId?: string; uploadedAt: string }

export interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' }
