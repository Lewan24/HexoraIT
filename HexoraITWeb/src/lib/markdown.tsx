export function renderMarkdown(content: string): React.ReactNode[] {
  const lines = content.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''

    if (line.startsWith('# ')) {
      nodes.push(<h1 key={i} className="text-base font-semibold text-ink-primary mt-4 mb-2 first:mt-0">{inlineFormat(line.slice(2))}</h1>)
    } else if (line.startsWith('## ')) {
      nodes.push(<h2 key={i} className="text-sm font-semibold text-ink-primary mt-4 mb-1.5">{inlineFormat(line.slice(3))}</h2>)
    } else if (line.startsWith('### ')) {
      nodes.push(<h3 key={i} className="text-xs font-semibold text-ink-secondary mt-3 mb-1">{inlineFormat(line.slice(4))}</h3>)
    } else if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
      nodes.push(
        <div key={i} className="flex items-start gap-2 my-0.5">
          <div className="w-3.5 h-3.5 rounded border border-blue-500 bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[8px] text-blue-400">✓</span>
          </div>
          <span className="text-xs text-ink-muted line-through">{inlineFormat(line.slice(6))}</span>
        </div>
      )
    } else if (line.startsWith('- [ ] ')) {
      nodes.push(
        <div key={i} className="flex items-start gap-2 my-0.5">
          <div className="w-3.5 h-3.5 rounded border border-edge-default flex-shrink-0 mt-0.5" />
          <span className="text-xs text-ink-secondary">{inlineFormat(line.slice(6))}</span>
        </div>
      )
    } else if (line.startsWith('- ')) {
      nodes.push(
        <div key={i} className="flex items-start gap-2 my-0.5">
          <span className="w-1 h-1 rounded-full bg-ink-muted flex-shrink-0 mt-1.5" />
          <span className="text-xs text-ink-secondary leading-relaxed">{inlineFormat(line.slice(2))}</span>
        </div>
      )
    } else if (line === '') {
      nodes.push(<div key={i} className="h-2" />)
    } else if (line.startsWith('---')) {
      nodes.push(<hr key={i} className="border-edge-subtle my-3" />)
    } else {
      nodes.push(<p key={i} className="text-xs text-ink-secondary leading-relaxed">{inlineFormat(line)}</p>)
    }
    i++
  }
  return nodes
}

export function inlineFormat(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0
  let m: RegExpExecArray | null

  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const match = m[0]
    if (match.startsWith('**')) {
      parts.push(<strong key={m.index} className="font-semibold text-ink-primary">{match.slice(2, -2)}</strong>)
    } else {
      parts.push(<code key={m.index} className="font-mono text-[10px] px-1 py-0.5 rounded bg-navy-600 border border-edge-default text-cyan-400">{match.slice(1, -1)}</code>)
    }
    last = m.index + match.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length === 0 ? text : <>{parts}</>
}

export function renderMarkdownCompact(content: string, maxLines = 3): React.ReactNode[] {
  const lines = content.split('\n').filter(l => l.trim() !== '').slice(0, maxLines)
  return lines.map((line, i) => {
    if (line.startsWith('# ') || line.startsWith('## ') || line.startsWith('### ')) {
      const text = line.replace(/^#+\s*/, '')
      return <p key={i} className="text-[11px] font-medium text-ink-secondary truncate">{text}</p>
    }
    if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
      return (
        <div key={i} className="flex items-center gap-1.5 min-w-0">
          <span className="text-[9px] text-blue-400 flex-shrink-0">✓</span>
          <span className="text-[11px] text-ink-muted line-through truncate">{line.slice(6)}</span>
        </div>
      )
    }
    if (line.startsWith('- [ ] ')) {
      return (
        <div key={i} className="flex items-center gap-1.5 min-w-0">
          <div className="w-2.5 h-2.5 rounded-sm border border-edge-default flex-shrink-0" />
          <span className="text-[11px] text-ink-muted truncate">{line.slice(6)}</span>
        </div>
      )
    }
    if (line.startsWith('- ')) {
      return (
        <div key={i} className="flex items-center gap-1.5 min-w-0">
          <span className="w-1 h-1 rounded-full bg-ink-muted flex-shrink-0" />
          <span className="text-[11px] text-ink-muted truncate">{line.slice(2)}</span>
        </div>
      )
    }
    if (line.startsWith('---')) return <hr key={i} className="border-edge-subtle my-1" />
    return <p key={i} className="text-[11px] text-ink-muted truncate">{line}</p>
  })
}