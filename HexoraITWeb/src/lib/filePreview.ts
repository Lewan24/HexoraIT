export type PreviewKind = 'pdf' | 'image' | 'docx' | 'xlsx' | 'text' | 'none'

const TEXT_MIME_PREFIXES = ['text/']
const TEXT_EXTENSIONS = ['.json', '.md', '.csv', '.log', '.txt', '.yml', '.yaml']

export function getPreviewKind(name: string, mimeType: string): PreviewKind {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase()

  if (mimeType === 'application/pdf' || ext === '.pdf') return 'pdf'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === '.docx') return 'docx'
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || ext === '.xlsx') return 'xlsx'
  if (TEXT_MIME_PREFIXES.some(p => mimeType.startsWith(p)) || TEXT_EXTENSIONS.includes(ext)) return 'text'
  return 'none'
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${bytes} B`
}