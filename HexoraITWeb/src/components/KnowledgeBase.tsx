import { useState } from 'react'
import {
  Plus, Search, X, Edit2, Trash2, Star, ArrowLeft,
  Tag, BookOpen, Loader2,
} from 'lucide-react'
import { useApp } from '../context/useApp'
import type { KnowledgeArticle } from '../api/types'
import { renderMarkdown } from '../lib/markdown'

const CATEGORY_SUGGESTIONS = ['Operations', 'Network', 'Security', 'HR & Processes', 'Hardware', 'Software', 'Other']

const CAT_COLORS: Record<string, string> = {
  Operations:       'text-blue-400 bg-blue-500/10 border-blue-500/25',
  Network:          'text-cyan-400 bg-cyan-500/10 border-cyan-500/25',
  Security:         'text-red-400 bg-red-500/10 border-red-500/25',
  'HR & Processes': 'text-purple-400 bg-purple-500/10 border-purple-500/25',
  Hardware:         'text-orange-400 bg-orange-500/10 border-orange-500/25',
  Software:         'text-green-400 bg-green-500/10 border-green-500/25',
  Other:            'text-ink-muted bg-navy-500/20 border-edge-default',
}

function catCls(cat: string) {
  return CAT_COLORS[cat] ?? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25'
}

const inp = (err?: string) =>
  `w-full px-3 py-2 rounded-lg bg-navy-700 border text-ink-primary text-xs placeholder:text-ink-muted focus:outline-none transition-colors disabled:opacity-50 ${err ? 'border-red-500/50 focus:border-red-500' : 'border-edge-default focus:border-blue-500'}`

function ArticleModal({ initial, onClose, onSave, onDelete }: {
  initial?: KnowledgeArticle
  onClose: () => void
  onSave: (a: Omit<KnowledgeArticle, 'id' | 'updatedAt'>) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    category: initial?.category ?? '',
    content: initial?.content ?? '',
    tags: initial?.tags.join(', ') ?? '',
    starred: initial?.starred ?? false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const set = (k: string, v: string | boolean) => {
    setForm(f => ({ ...f, [k]: v }))
    if (typeof v === 'string') setErrors(e => ({ ...e, [k]: '' }))
  }

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = 'Required'
    if (!form.category.trim()) e.category = 'Required'
    setErrors(e)
    if (Object.keys(e).length || submitting) return
    setSubmitting(true)
    try {
      await onSave({
        title: form.title.trim(),
        category: form.category.trim(),
        content: form.content.trim(),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        starred: form.starred,
      })
    } catch {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete()
    } catch {
      setDeleting(false)
    }
  }

  const busy = submitting || deleting

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        style={{ animation: 'modalIn 0.18s ease-out' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-edge-subtle">
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">{initial ? 'Edit Article' : 'New Article'}</h2>
            <p className="text-[11px] text-ink-muted mt-0.5">Supports **bold**, `code`, # headers, - lists, - [ ] checkboxes</p>
          </div>
          <button onClick={() => !busy && onClose()} disabled={busy} className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors disabled:opacity-40"><X size={14} /></button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Article title" className={inp(errors.title)} autoFocus disabled={busy} />
            {errors.title && <p className="text-[10px] text-red-400 mt-1">{errors.title}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Category *</label>
            <input
              value={form.category}
              onChange={e => set('category', e.target.value)}
              list="kb-categories"
              placeholder="e.g. Network"
              className={inp(errors.category)}
              disabled={busy}
            />
            <datalist id="kb-categories">
              {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
            </datalist>
            {errors.category && <p className="text-[10px] text-red-400 mt-1">{errors.category}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Content</label>
            <textarea
              value={form.content}
              onChange={e => set('content', e.target.value)}
              rows={12}
              placeholder={`# Main Title\n\n## Section\n\nWrite your article content here.\n\n- Bullet point\n- [ ] Checkbox item\n- [x] Completed item\n\n**bold text** and \`inline code\``}
              className={inp() + ' resize-none font-mono leading-relaxed'}
              disabled={busy}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Tags (comma-separated)</label>
            <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="vpn, routing, setup" className={inp()} disabled={busy} />
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-edge-subtle bg-navy-900/40">
          <div className="flex items-center gap-3">
            <button onClick={() => !busy && set('starred', !form.starred)} disabled={busy}
              className={`flex items-center gap-1.5 text-xs transition-colors disabled:opacity-40 ${form.starred ? 'text-yellow-400' : 'text-ink-muted hover:text-ink-secondary'}`}>
              <Star size={13} className={form.starred ? 'fill-yellow-400' : ''} /> Starred
            </button>
            {initial && onDelete && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-ink-muted">Delete?</span>
                  <button onClick={handleDelete} disabled={deleting} className="text-[11px] text-red-400 hover:text-red-300 font-medium disabled:opacity-50 flex items-center gap-1">
                    {deleting && <Loader2 size={10} className="animate-spin" />} Yes
                  </button>
                  <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="text-[11px] text-ink-muted disabled:opacity-50">No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} disabled={busy} className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-red-400 transition-colors disabled:opacity-40">
                  <Trash2 size={12} /> Delete
                </button>
              )
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => !busy && onClose()} disabled={busy} className="px-4 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-600 text-ink-secondary text-xs border border-edge-default transition-colors disabled:opacity-40">Cancel</button>
            <button onClick={submit} disabled={busy} className="px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-60 flex items-center gap-1.5"
              style={{ boxShadow: '0 1px 10px rgba(37,99,235,0.3)' }}>
              {submitting && <Loader2 size={11} className="animate-spin" />}
              {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Create Article'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Article List Item ────────────────────────────────────────────────────────

function ArticleItem({ article, selected, onClick }: { article: KnowledgeArticle; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-navy-700/50 ${selected ? 'bg-navy-700/70 border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {article.starred && <Star size={10} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />}
          <p className="text-xs font-semibold text-ink-primary truncate">{article.title}</p>
        </div>
        <span className={`inline-block text-[9px] font-mono px-1.5 py-0.5 rounded border ${catCls(article.category)} mb-1`}>{article.category}</span>
        <p className="text-[10px] text-ink-muted font-mono">{article.updatedAt}</p>
      </div>
    </button>
  )
}

// ─── KnowledgeBase ────────────────────────────────────────────────────────────

export default function KnowledgeBase() {
  const { knowledgeArticles, isLoading, addKnowledge, updateKnowledge, deleteKnowledge, toggleStarKnowledge } = useApp()
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState<string>('All')
  const [starOnly, setStarOnly] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; initial?: KnowledgeArticle }>({ open: false })

  const categories = ['All', ...Array.from(new Set(knowledgeArticles.map(a => a.category)))]

  const filtered = knowledgeArticles.filter(a =>
    (!starOnly || a.starred) &&
    (catFilter === 'All' || a.category === catFilter) &&
    (a.title.toLowerCase().includes(query.toLowerCase()) ||
     a.content.toLowerCase().includes(query.toLowerCase()) ||
     a.tags.some(t => t.toLowerCase().includes(query.toLowerCase())))
  )

  const selected =
  knowledgeArticles.find(a => a.id === selectedId)
  ?? knowledgeArticles[0]
  ?? null

  const handleSave = async (data: Omit<KnowledgeArticle, 'id' | 'updatedAt'>) => {
    if (modal.initial) {
      await updateKnowledge({ ...modal.initial, ...data })
    } else {
      const before = new Set(knowledgeArticles.map(a => a.id))
      await addKnowledge(data)
      // select the newly created article once it lands in state
      setTimeout(() => {
        setSelectedId(prev => prev)
      }, 0)
      void before
    }
    setModal({ open: false })
  }

  const handleDelete = async (id: string) => {
    await deleteKnowledge(id)
    setSelectedId(filtered.find(a => a.id !== id)?.id ?? null)
    setMobileDetailOpen(false)
    setModal({ open: false })
  }

  const selectArticle = (a: KnowledgeArticle) => {
    setSelectedId(a.id)
    setMobileDetailOpen(true)
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1200px] h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary">Knowledge Base</h1>
          <p className="text-xs text-ink-muted mt-0.5">{knowledgeArticles.length} articles</p>
        </div>
        <button onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 active:scale-95 text-white text-sm font-medium transition-all flex-shrink-0"
          style={{ boxShadow: '0 1px 12px rgba(37,99,235,0.3)' }}>
          <Plus size={14} /> New Article
        </button>
      </div>

      {/* Two-panel */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-0">
        {/* List panel */}
        <div className={`lg:col-span-2 bg-navy-800 border border-edge-subtle rounded-xl flex flex-col overflow-hidden ${mobileDetailOpen ? 'hidden lg:flex' : 'flex'}`}>
          {/* Search */}
          <div className="px-4 py-3 border-b border-edge-subtle space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search articles…"
                  className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-navy-700 border border-edge-default text-ink-primary text-xs placeholder:text-ink-muted focus:border-blue-500 focus:outline-none transition-colors" />
              </div>
              <button onClick={() => setStarOnly(!starOnly)}
                className={`p-1.5 rounded-lg border transition-colors ${starOnly ? 'bg-yellow-400/10 border-yellow-400/40 text-yellow-400' : 'border-edge-default text-ink-muted hover:text-ink-primary bg-navy-700'}`}>
                <Star size={13} className={starOnly ? 'fill-yellow-400' : ''} />
              </button>
            </div>
            {/* Category filter pills */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
              {categories.map(c => (
                <button key={c} onClick={() => setCatFilter(c)}
                  className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
                    catFilter === c
                      ? c === 'All' ? 'bg-blue-500/15 border-blue-500/40 text-blue-400' : catCls(c)
                      : 'border-edge-default text-ink-muted bg-navy-700'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Article list */}
          <div className="flex-1 overflow-y-auto divide-y divide-edge-subtle">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
                <BookOpen size={24} className="text-ink-muted opacity-30" />
                <p className="text-sm text-ink-muted">No articles found</p>
                <button onClick={() => setModal({ open: true })} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">+ New Article</button>
              </div>
            ) : (
              filtered.map(a => (
                <ArticleItem key={a.id} article={a} selected={selectedId === a.id} onClick={() => selectArticle(a)} />
              ))
            )}
          </div>
        </div>

        {/* Article detail */}
        <div className={`lg:col-span-3 ${mobileDetailOpen ? 'flex flex-col' : 'hidden lg:flex flex-col'}`}>
          {mobileDetailOpen && (
            <button onClick={() => setMobileDetailOpen(false)}
              className="lg:hidden flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mb-3 transition-colors flex-shrink-0">
              <ArrowLeft size={14} /> Back to articles
            </button>
          )}
          {selected ? (
            <div className="bg-navy-800 border border-edge-subtle rounded-xl overflow-hidden flex flex-col flex-1">
              {/* Article header */}
              <div className="px-5 py-4 border-b border-edge-subtle flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-primary">{selected.title}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${catCls(selected.category)}`}>{selected.category}</span>
                    <span className="text-[10px] font-mono text-ink-muted">Updated {selected.updatedAt}</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => toggleStarKnowledge(selected.id)}
                    className={`p-1.5 rounded-md transition-colors hover:bg-navy-700 ${selected.starred ? 'text-yellow-400' : 'text-ink-muted hover:text-yellow-400'}`}>
                    <Star size={13} className={selected.starred ? 'fill-yellow-400' : ''} />
                  </button>
                  <button onClick={() => setModal({ open: true, initial: selected })}
                    className="p-1.5 rounded-md hover:bg-navy-700 text-ink-muted hover:text-ink-primary transition-colors">
                    <Edit2 size={13} />
                  </button>
                </div>
              </div>

              {/* Article content */}
              <div className="flex-1 overflow-y-auto px-5 py-5">
                {selected.content ? (
                  <div className="space-y-0.5">{renderMarkdown(selected.content)}</div>
                ) : (
                  <p className="text-xs text-ink-muted italic">No content yet. Click edit to add content.</p>
                )}
              </div>

              {/* Tags */}
              {selected.tags.length > 0 && (
                <div className="px-5 py-3 border-t border-edge-subtle flex items-center gap-1.5 flex-wrap">
                  <Tag size={11} className="text-ink-muted" />
                  {selected.tags.map(t => (
                    <span key={t} className="text-[10px] text-ink-muted px-1.5 py-0.5 rounded-full bg-navy-700 border border-edge-subtle">{t}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-navy-800 border border-edge-subtle rounded-xl flex items-center justify-center flex-1 min-h-[200px]">
              <div className="text-center">
                <BookOpen size={28} className="text-ink-muted mx-auto mb-2 opacity-30" />
                <p className="text-sm text-ink-muted">Select an article to read</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {modal.open && (
        <ArticleModal
          initial={modal.initial}
          onClose={() => setModal({ open: false })}
          onSave={handleSave}
          onDelete={modal.initial ? () => handleDelete(modal.initial!.id) : undefined}
        />
      )}
    </div>
  )
}