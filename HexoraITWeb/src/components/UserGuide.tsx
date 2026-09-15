import { useState, type ReactNode } from 'react'
import { BookOpenText, Search, ArrowRight, Info } from 'lucide-react'
import manual from '../content/instrukcja-obslugi.md?raw'
import { useAuth } from '../context/useAuth'
import './UserGuide.css'

// The manual is bundled by Vite; reading help never fetches organization data.
const chapters = manual.replace(/\r/g, '').split(/^## /m).slice(2).map((chapter, index) => {
  const [title = '', ...body] = chapter.split('\n')
  return {
    id: `chapter-${index}`,
    title: title.replace(/^\d+\. /, ''),
    topics: body.join('\n').split(/^### /m).filter(part => part.trim()).map((part, topicIndex) => {
      const [heading = '', ...text] = part.split('\n')
      return { id: `topic-${index}-${topicIndex}`, title: heading.trim() || 'Pytania i odpowiedzi', body: text.join('\n') }
    }),
  }
})

const clientTopics = [
  ...chapters[0]!.topics.filter(topic => ['Pierwsze logowanie i orientacja na ekranie', 'Osobna ścieżka dla klienta'].includes(topic.title)),
  { id: 'client-access', title: 'Dostęp do dokumentacji', body: 'Domyślnie masz dostęp do **Zgłoś problem**, osobistych **Ustawień** i **Instrukcji obsługi**. Dodatkowe zakładki i dane udostępnia opiekun Twojej organizacji.\n\nJeśli nie widzisz potrzebnych informacji albo nie możesz zapisać zmian, skontaktuj się z opiekunem. Instrukcja obsługi nie nadaje uprawnień do modułów.\n\nJeśli nie masz przypisanej organizacji, poproś opiekuna o sprawdzenie konta. Jeśli nie pamiętasz hasła, skontaktuj się z administratorem systemu.' },
].map(topic => topic.title === 'Pierwsze logowanie i orientacja na ekranie' ? {
  ...topic,
  body: 'Po zalogowaniu otwiera się **Zgłoś problem**. Twoje konto jest przypisane do jednej organizacji. Na telefonie otwórz menu przyciskiem w górnym pasku.\n\nW **Ustawienia → Profil** zmienisz swoją nazwę, w **Ustawienia → Wygląd** język i motyw, a w **Ustawienia → Bezpieczeństwo** hasło. Podaj obecne i nowe hasło (co najmniej 8 znaków).\n\nPrzycisk wylogowania znajduje się przy danych użytkownika i w górnym pasku.',
} : topic)

function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) =>
    part.startsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong>
      : part.startsWith('`') ? <code key={index}>{part.slice(1, -1)}</code> : part)
}

// Restricted to the bundled document's syntax. Text is rendered by React, never as HTML.
function GuideBody({ content }: { content: string }) {
  const lines = content.trim().split('\n')
  const blocks: ReactNode[] = []
  for (let i = 0; i < lines.length;) {
    const line = lines[i]!
    if (!line.trim()) { i++; continue }
    const key = i
    if (line.trim().startsWith('```')) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i]!.trim().startsWith('```')) code.push(lines[i++]!.replace(/^ {3}/, ''))
      i++
      blocks.push(<pre key={key}><code>{code.join('\n')}</code></pre>)
    } else if (line.startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i]!.startsWith('|')) {
        const cells = lines[i++]!.split('|').slice(1, -1).map(cell => cell.trim())
        if (!cells.every(cell => /^:?-+:?$/.test(cell))) rows.push(cells)
      }
      blocks.push(<div className="guide-table" key={key} role="region" aria-label="Tabela instrukcji" tabIndex={0}><table>
        <thead><tr>{rows[0]!.map((cell, j) => <th scope="col" key={j}>{inline(cell)}</th>)}</tr></thead>
        <tbody>{rows.slice(1).map((row, j) => <tr key={j}>{row.map((cell, k) => <td key={k}>{inline(cell)}</td>)}</tr>)}</tbody>
      </table></div>)
    } else if (/^\d+\. /.test(line)) {
      const items: ReactNode[] = []
      const start = Number(line.match(/^\d+/)?.[0])
      while (i < lines.length && /^\d+\. /.test(lines[i]!)) {
        const itemKey = i
        const label = lines[i++]!.replace(/^\d+\. /, '')
        const nested: string[] = []
        while (i < lines.length && /^ {3}- /.test(lines[i]!)) nested.push(lines[i++]!.slice(5))
        items.push(<li key={itemKey}>{inline(label)}{nested.length > 0 && <ul>{nested.map((item, j) => <li key={j}>{inline(item)}</li>)}</ul>}</li>)
      }
      blocks.push(<ol start={start} key={key}>{items}</ol>)
    } else if (line.startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && lines[i]!.startsWith('- ')) items.push(lines[i++]!.slice(2))
      blocks.push(<ul key={key}>{items.map((item, j) => <li key={j}>{inline(item)}</li>)}</ul>)
    } else {
      blocks.push(<p key={key} className={/^\*\*(Cel|Efekt|Przykład)/.test(line) ? 'guide-callout' : undefined}>{inline(line)}</p>)
      i++
    }
  }
  return <div className="guide-prose">{blocks}</div>
}

export default function UserGuide() {
  const { user } = useAuth()
  const isClient = user?.systemRole === 'Client'
  const sections = isClient ? [{ id: 'client', title: 'Przewodnik klienta', topics: clientTopics }] : chapters
  const [selected, setSelected] = useState(sections[0]!.id)
  const [query, setQuery] = useState('')
  const active = sections.find(section => section.id === selected) ?? sections[0]!
  const normalized = query.trim().toLocaleLowerCase('pl')
  const visible = (normalized ? sections : [active]).map(section => ({ ...section,
    topics: section.topics.filter(topic => !normalized || `${section.title} ${topic.title} ${topic.body}`.toLocaleLowerCase('pl').includes(normalized)),
  })).filter(section => section.topics.length)
  const count = visible.reduce((total, section) => total + section.topics.length, 0)

  return <div className="user-guide mx-auto max-w-7xl p-4 sm:p-8" lang="pl">
    <header className="guide-hero rounded-2xl border border-edge-default p-6 sm:p-8 mb-6">
      <div className="flex items-center gap-2 text-sm text-ink-secondary mb-4"><BookOpenText size={19} /> CENTRUM POMOCY <span className="ml-auto text-xs">PL</span></div>
      <h1 className="text-2xl sm:text-3xl font-semibold text-ink-primary">Instrukcja obsługi</h1>
      <p className="text-ink-secondary mt-3 max-w-2xl leading-relaxed">{isClient ? 'Zgłoś problem, zadbaj o swoje konto i sprawdź, jak korzystać z udostępnionych informacji.' : 'Poznaj HexoraIT krok po kroku — od codziennej pracy po zarządzanie kontami i organizacjami.'}</p>
      <label className="flex items-center gap-3 mt-6 rounded-xl bg-navy-950 border border-edge-strong px-4 py-3 max-w-xl">
        <Search size={18} className="text-ink-muted flex-shrink-0" />
        <span className="sr-only">Szukaj w instrukcji</span>
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Szukaj tematu, np. hasło, rola, zgłoszenie…" className="w-full min-w-0 bg-transparent text-sm text-ink-primary outline-none" />
      </label>
    </header>
    <div className="grid lg:grid-cols-[250px_minmax(0,1fr)] gap-6 items-start">
      <aside className="lg:sticky lg:top-6 rounded-xl border border-edge-subtle bg-navy-900 p-3">
        <h2 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">Rozdziały</h2>
        <nav aria-label="Rozdziały instrukcji" className="space-y-1">{sections.map((section, index) =>
          <button key={section.id} aria-current={!normalized && active.id === section.id ? 'page' : undefined} onClick={() => { setSelected(section.id); setQuery('') }} className={`w-full flex items-start gap-3 text-left p-3 rounded-lg text-sm ${!normalized && active.id === section.id ? 'bg-blue-500/10 text-ink-primary font-medium' : 'text-ink-secondary hover:bg-navy-700'}`}>
            <span className="text-ink-muted font-mono text-xs mt-0.5">0{index + 1}</span>{section.title}
          </button>)}</nav>
        <div className="mt-4 border-t border-edge-subtle p-3 text-xs leading-relaxed text-ink-muted flex gap-2"><Info size={16} className="flex-shrink-0 mt-0.5" /><p>Dostępność opisanych funkcji zależy od uprawnień Twojego konta. Potrzebujesz dostępu? Skontaktuj się z opiekunem.</p></div>
      </aside>
      <div className="min-w-0">
        {normalized && <p role="status" className="text-sm text-ink-secondary mb-4">Znalezione tematy: {count}</p>}
        {count === 0 && <div className="rounded-xl border border-edge-default p-8 text-center"><h2 className="text-lg text-ink-primary font-semibold">Brak pasujących tematów</h2><p className="mt-2 text-ink-secondary">Spróbuj krótszej frazy, np. „hasło” lub „konto”.</p><button onClick={() => setQuery('')} className="mt-4 text-ink-primary underline">Wyczyść wyszukiwanie</button></div>}
        {visible.map(section => <section key={section.id} className="mb-8">
          <h2 className="text-xl font-semibold text-ink-primary mb-4">{section.title}</h2>
          <nav aria-label={`Tematy: ${section.title}`} className="grid sm:grid-cols-2 gap-2 mb-6">{section.topics.map(topic => <a key={topic.id} href={`#${topic.id}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-secondary hover:bg-navy-800 hover:text-ink-primary"><ArrowRight size={14} className="flex-shrink-0" />{topic.title}</a>)}</nav>
          <div className="space-y-5">{section.topics.map(topic => <article key={topic.id} id={topic.id} className="scroll-mt-6 rounded-xl border border-edge-default bg-navy-900 p-5 sm:p-7">
            <h3 className="text-lg font-semibold text-ink-primary mb-5">{topic.title}</h3>
            <GuideBody content={topic.body} />
          </article>)}</div>
        </section>)}
        <p className="text-xs text-ink-muted leading-relaxed border-t border-edge-subtle pt-4">Instrukcja w języku polskim · Stan opisu: 15 września 2026 r.</p>
      </div>
    </div>
  </div>
}
