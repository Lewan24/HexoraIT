import { useId, useRef, useState } from "react"
import {
  Bold,
  Code,
  Heading2,
  List,
  ListChecks,
  Eye,
  Pencil,
} from "lucide-react"
import { tr, useLocale } from "../i18n"
import { renderMarkdown } from "../lib/markdown"
import { markdownEdit, type MarkdownAction } from "../lib/markdownEdit"

export default function MarkdownEditor({
  value,
  onChange,
  disabled = false,
  initialPreview = false,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  initialPreview?: boolean
}) {
  useLocale()
  const id = useId()
  const textarea = useRef<HTMLTextAreaElement>(null)
  const [preview, setPreview] = useState(initialPreview)
  const tools: {
    action: MarkdownAction
    label: string
    icon: React.ReactNode
  }[] = [
    { action: "bold", label: "Bold", icon: <Bold size={14} /> },
    { action: "heading", label: "Heading", icon: <Heading2 size={14} /> },
    { action: "list", label: "Bullet list", icon: <List size={14} /> },
    { action: "checklist", label: "Checklist", icon: <ListChecks size={14} /> },
    { action: "code", label: "Inline code", icon: <Code size={14} /> },
  ]
  const insert = (action: MarkdownAction) => {
    const input = textarea.current
    if (!input || disabled) return
    const edit = markdownEdit(
      value,
      input.selectionStart,
      input.selectionEnd,
      action,
    )
    if (edit.value.length > 100000) return
    onChange(edit.value)
    requestAnimationFrame(() => {
      input.focus()
      input.setSelectionRange(edit.start, edit.end)
    })
  }
  return (
    <div className="overflow-hidden rounded-xl border border-edge-default bg-navy-900/30">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge-subtle bg-navy-800 px-2 py-2">
        <div
          role="toolbar"
          aria-label={tr("Text formatting")}
          className="flex items-center gap-0.5"
        >
          {tools.map((tool) => (
            <button
              key={tool.action}
              type="button"
              title={tr(tool.label)}
              aria-label={tr(tool.label)}
              disabled={disabled || preview}
              onClick={() => insert(tool.action)}
              className="rounded-md p-2 text-ink-muted hover:bg-navy-700 hover:text-ink-primary disabled:opacity-30"
            >
              {tool.icon}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg bg-navy-700 p-0.5">
          {[false, true].map((showPreview) => (
            <button
              key={String(showPreview)}
              type="button"
              aria-pressed={preview === showPreview}
              disabled={disabled}
              onClick={() => setPreview(showPreview)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs ${
                preview === showPreview
                  ? "bg-navy-600 text-ink-primary shadow-sm"
                  : "text-ink-muted"
              }`}
            >
              {showPreview ? <Eye size={12} /> : <Pencil size={12} />}
              {showPreview ? tr("Preview") : tr("Edit text")}
            </button>
          ))}
        </div>
      </div>
      <label htmlFor={id} className="sr-only">
        {tr("Note content")}
      </label>
      {preview ? (
        <div
          className="min-h-64 space-y-1 break-words p-4 [overflow-wrap:anywhere]"
          role="region"
          aria-label={tr("Note preview")}
        >
          {value.trim() ? (
            renderMarkdown(value)
          ) : (
            <p className="py-8 text-center text-sm text-ink-muted">
              {tr("Nothing to preview yet")}
            </p>
          )}
        </div>
      ) : (
        <textarea
          id={id}
          ref={textarea}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          maxLength={100000}
          placeholder={tr(
            "Write a note. Use headings, lists and checkboxes to keep it organized.",
          )}
          className="block min-h-64 w-full resize-y bg-transparent p-4 font-mono text-xs leading-relaxed text-ink-primary outline-none disabled:opacity-50"
        />
      )}
      <div className="border-t border-edge-subtle px-3 py-2 text-right text-[10px] text-ink-muted">
        {value.length.toLocaleString()} / 100 000
      </div>
    </div>
  )
}
