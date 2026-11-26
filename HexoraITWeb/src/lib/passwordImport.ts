export const PASSWORD_CATEGORIES = [
  'Cloud', 'Hypervisor', 'Network', 'Active Directory', 'Storage', 'Database', 'Application',
  'Operating System', 'Email', 'VPN', 'Wi-Fi', 'Service Account', 'API Token', 'Backup', 'Security',
  'Domain & DNS', 'DevOps', 'Remote Access', 'Other',
]

export const MAX_IMPORT_ENTRIES = 5000

export interface ParsedPassword {
  name: string
  username: string
  password: string
  row: number
}

export interface PasswordImportEntry extends Omit<ParsedPassword, 'row'> {
  category: string
  replaceId?: string
  expectedUpdatedAt?: string
  expectedTitleCount?: number
}

export const passwordTitle = (name: string) => name.trim().normalize().toLowerCase()

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

export function parsePasswordFile(contents: string, format: 'json' | 'txt') {
  const entries: ParsedPassword[] = []
  const invalidRows: number[] = []
  let skipped = 0

  function add(row: number, title: unknown, username: unknown, password: unknown) {
    const name = typeof title === 'string' ? title.trim() : ''
    if (!name || name.length > 200 || name.includes('\0') ||
        typeof username !== 'string' || username.length > 500 || username.includes('\0') ||
        typeof password !== 'string' || !password || password.length > 10000) {
      invalidRows.push(row)
      return
    }
    entries.push({ name, username, password, row })
  }

  contents = contents.replace(/^\uFEFF/, '')
  if (format === 'json') {
    let data: Record<string, unknown>
    try { data = object(JSON.parse(contents)) }
    catch { throw new Error('Select a valid Bitwarden JSON export.') }
    if (data.encrypted === true) throw new Error('Select an unencrypted Bitwarden JSON export.')
    if (!Array.isArray(data.items)) throw new Error('Select a valid Bitwarden JSON export.')
    data.items.forEach((raw: unknown, index: number) => {
      const item = object(raw)
      const login = object(item.login)
      if (item.type !== 1 || login.password == null || login.password === '') {
        skipped++
        return
      }
      add(index + 1, item.name, login.username ?? '', login.password)
    })
  } else {
    contents.split(/\r\n|\n|\r/).forEach((line, index) => {
      if (!line.trim()) return
      const fields = line.trim().match(/^(.+?)\s+(\S+)\s+(\S+)$/u)
      if (fields) add(index + 1, fields[1], fields[2], fields[3])
      else invalidRows.push(index + 1)
    })
  }

  if (entries.length > MAX_IMPORT_ENTRIES) throw new Error('A file can contain up to 5,000 passwords.')
  return { entries, invalidRows, skipped }
}
