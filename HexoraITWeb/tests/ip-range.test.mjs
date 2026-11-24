import assert from 'node:assert/strict'
import test from 'node:test'
import { compareIpEntries, dhcpOffsets, parseIpRange, rangeOffset, subnetAddresses } from '../src/lib/ipRange.ts'

test('a /24 includes all 256 addresses and labels its two special addresses', () => {
  const range = parseIpRange('192.168.0.240/24')
  const page = subnetAddresses(range, 0n, 256)
  assert.equal(page.length, 256)
  assert.deepEqual(page[0], { offset: 0n, ip: '192.168.0.0', kind: 'network' })
  assert.deepEqual(page[255], { offset: 255n, ip: '192.168.0.255', kind: 'broadcast' })
  assert.equal(rangeOffset(range, '192.168.0.127'), 127n)
  assert.equal(rangeOffset(range, '192.168.1.0'), undefined)
  assert.equal(rangeOffset(range, '::ffff:192.168.0.127'), 127n)
})

test('IPv4 point-to-point ranges include both addresses without network or broadcast labels', () => {
  const range = parseIpRange('10.0.0.3/31')
  assert.deepEqual(subnetAddresses(range, 0n, 256).map(({ ip, kind }) => [ip, kind]),
    [['10.0.0.2', undefined], ['10.0.0.3', undefined]])
  assert.equal(subnetAddresses(parseIpRange('10.0.0.3/32'), 0n, 256).length, 1)
})

test('large IPv6 ranges generate only the requested page and match equivalent saved addresses', () => {
  const range = parseIpRange('2001:db8::/64')
  assert.equal(range.count, 2n ** 64n)
  assert.equal(rangeOffset(range, '2001:0db8:0000:0000:ffff:ffff:ffff:ffff'), range.count - 1n)
  const page = subnetAddresses(range, range.count - 256n, 256)
  assert.equal(page.length, 256)
  assert.equal(page[0].ip, '2001:db8::ffff:ffff:ffff:ff00')
  assert.equal(page.at(-1).ip, '2001:db8::ffff:ffff:ffff:ffff')
  assert.equal(rangeOffset(range, '192.0.2.1'), undefined)
  for (const invalid of ['10.0.0.0/33', '10.01.0.0/24', '2001:db8::/129', '2001:db8:::1/64'])
    assert.equal(parseIpRange(invalid), undefined)
})

test('DHCP endpoints must be ordered hosts in the configured subnet', () => {
  const range = parseIpRange('10.0.0.0/24')
  assert.deepEqual(dhcpOffsets(range, '10.0.0.20', '10.0.0.40'), { first: 20n, last: 40n })
  assert.equal(dhcpOffsets(range, '10.0.0.0', '10.0.0.40'), undefined)
  assert.equal(dhcpOffsets(range, '10.0.0.20', '10.0.0.255'), undefined)
  assert.equal(dhcpOffsets(range, '10.0.0.40', '10.0.0.20'), undefined)
  assert.equal(dhcpOffsets(range, '10.0.0.40', '10.0.1.20'), undefined)
  assert.deepEqual(dhcpOffsets(parseIpRange('2001:db8::/64'), '2001:db8::20', '2001:db8::40'), { first: 32n, last: 64n })
})

test('saved addresses sort by explicit order first and then by numeric IPv4 and IPv6 addresses', () => {
  const rows = [
    { id: 'v6-high', ip: '2001:db8::100' },
    { id: 'v4-high', ip: '192.168.0.100' },
    { id: 'first', ip: '192.168.0.200', sortIndex: 1 },
    { id: 'v4-two', ip: '192.168.0.2', sortIndex: null },
    { id: 'v4-ten', ip: '192.168.0.10' },
    { id: 'second', ip: '2001:db8::f', sortIndex: 2 },
    { id: 'v6-low', ip: '2001:0db8:0:0:0:0:0:ff' },
  ]
  assert.deepEqual(rows.sort(compareIpEntries).map(row => row.id),
    ['first', 'second', 'v4-two', 'v4-ten', 'v4-high', 'v6-low', 'v6-high'])
})
