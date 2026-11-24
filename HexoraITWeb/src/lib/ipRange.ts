export interface IpAddress {
  bits: 32 | 128
  value: bigint
}

export interface IpRange {
  bits: 32 | 128
  prefix: number
  first: bigint
  count: bigint
}

function ipv4(input: string): bigint | undefined {
  const octets = input.split('.')
  if (octets.length !== 4 || octets.some(part => !/^(0|[1-9]\d{0,2})$/.test(part) || Number(part) > 255))
    return undefined
  return octets.reduce((value, part) => (value << 8n) + BigInt(part), 0n)
}

export function parseIpAddress(input: string): IpAddress | undefined {
  let text = input.trim().toLowerCase()
  if (!text.includes(':')) {
    const value = ipv4(text)
    return value === undefined ? undefined : { bits: 32, value }
  }

  if (text.includes('.')) {
    const lastColon = text.lastIndexOf(':')
    const tail = ipv4(text.slice(lastColon + 1))
    if (tail === undefined) return
    text = text.slice(0, lastColon + 1) + (tail >> 16n).toString(16) + ':' + (tail & 0xffffn).toString(16)
  }

  const halves = text.split('::')
  if (halves.length > 2) return
  const left = halves[0] ? halves[0].split(':') : []
  const right = halves[1] ? halves[1].split(':') : []
  const missing = 8 - left.length - right.length
  if ((halves.length === 2 ? missing < 1 : missing !== 0) ||
      [...left, ...right].some(part => !/^[0-9a-f]{1,4}$/.test(part))) return
  const groups = [...left, ...Array<string>(missing).fill('0'), ...right]
  const value = groups.reduce((result, part) => (result << 16n) + BigInt('0x' + part), 0n)

  // Keep mapped addresses consistent with the backend IP parser.
  return value >> 32n === 0xffffn ? { bits: 32, value: value & 0xffffffffn } : { bits: 128, value }
}

export function parseIpRange(cidr: string): IpRange | undefined {
  const parts = cidr.trim().split('/')
  if (parts.length !== 2 || !/^\+?\d+$/.test(parts[1]!.trim())) return
  const address = parseIpAddress(parts[0]!)
  const prefix = Number(parts[1])
  if (!address || prefix > address.bits) return
  const count = 1n << BigInt(address.bits - prefix)
  return { bits: address.bits, prefix, first: address.value - address.value % count, count }
}

export function rangeOffset(range: IpRange, ip: string): bigint | undefined {
  const address = parseIpAddress(ip)
  if (address?.bits !== range.bits) return
  const offset = address.value - range.first
  return offset >= 0n && offset < range.count ? offset : undefined
}

export function subnetAddressKind(range: IpRange, offset: bigint): 'network' | 'broadcast' | undefined {
  if (range.bits !== 32 || range.prefix >= 31) return undefined
  if (offset === 0n) return 'network'
  return offset === range.count - 1n ? 'broadcast' : undefined
}

export function compareIpEntries(
  a: { id: string; ip: string; sortIndex?: number | null },
  b: { id: string; ip: string; sortIndex?: number | null },
): number {
  const first = a.sortIndex ?? Infinity
  const second = b.sortIndex ?? Infinity
  if (first !== second) return first - second
  const left = parseIpAddress(a.ip)
  const right = parseIpAddress(b.ip)
  if (!left || !right) {
    if (left) return -1
    if (right) return 1
  } else {
    if (left.bits !== right.bits) return left.bits - right.bits
    if (left.value !== right.value) return left.value < right.value ? -1 : 1
  }
  return a.ip.localeCompare(b.ip) || a.id.localeCompare(b.id)
}

export function dhcpOffsets(range: IpRange, start: string, end: string) {
  const first = rangeOffset(range, start)
  const last = rangeOffset(range, end)
  if (first === undefined || last === undefined || first > last) return
  if (subnetAddressKind(range, first) || subnetAddressKind(range, last)) return
  return { first, last }
}

export function formatIpAddress({ bits, value }: IpAddress): string {
  if (bits === 32)
    return [24n, 16n, 8n, 0n].map(shift => String((value >> shift) & 255n)).join('.')

  const words = Array.from({ length: 8 }, (_, i) => ((value >> BigInt((7 - i) * 16)) & 0xffffn).toString(16))
  let best = { start: 0, length: 1 }
  for (let i = 0; i < words.length;) {
    if (words[i] !== '0') { i++; continue }
    let end = i + 1
    while (words[end] === '0') end++
    if (end - i > best.length) best = { start: i, length: end - i }
    i = end
  }
  return best.length > 1
    ? words.slice(0, best.start).join(':') + '::' + words.slice(best.start + best.length).join(':')
    : words.join(':')
}

export function subnetAddresses(range: IpRange, start: bigint, pageSize: number) {
  const remaining = range.count - start
  const length = remaining > BigInt(pageSize) ? pageSize : Number(remaining > 0n ? remaining : 0n)
  return Array.from({ length }, (_, index) => {
    const offset = start + BigInt(index)
    const kind = subnetAddressKind(range, offset)
    return { offset, kind, ip: formatIpAddress({ bits: range.bits, value: range.first + offset }) }
  })
}
