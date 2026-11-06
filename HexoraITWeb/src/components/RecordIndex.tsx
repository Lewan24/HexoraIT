export default function RecordIndex({ index }: { index?: number | null }) {
  return index == null ? null : <span className="mr-1.5 inline-block rounded border border-edge-default px-1 py-0.5 align-middle font-mono text-[10px] font-normal text-ink-muted">#{index}</span>
}
