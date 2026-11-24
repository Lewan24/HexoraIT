export interface ContextResource {
  resource: string
  id: string
  name: string
}

export interface ContextAction {
  label: string
  run: () => void
  danger?: boolean
}

export function contextItem(resource: string, id: string, name: string, options?: { open?: string; link?: boolean }) {
  return {
    'data-context-item': `${resource}/${id}`,
    'data-context-resource': resource,
    'data-context-id': id,
    'data-context-name': name,
    'data-context-open': options?.open,
    'data-context-link': options?.link !== false ? 'true' : undefined,
    tabIndex: 0,
  }
}
