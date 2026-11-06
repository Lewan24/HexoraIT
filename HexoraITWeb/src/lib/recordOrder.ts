import type { OrderedRecord } from '../api/types'

export function compareRecordOrder(a: OrderedRecord, b: OrderedRecord): number {
  return (a.sortIndex ?? Number.MAX_SAFE_INTEGER) - (b.sortIndex ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id)
}
export function orderRecords<T extends OrderedRecord>(records: readonly T[]): T[] { return [...records].sort(compareRecordOrder) }
export interface RecordOrderChange { id: string; sortIndex: number | null }
export interface RecordOrderEvent { organizationId: string; resource: string; changes: RecordOrderChange[] }
