import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { tr } from '../../i18n'
import { config } from '../../../config'
import { useApp } from '../../context/useApp'
import { ContextActions, ContextSelectionActions, type SelectionCommands } from './useContextActions'
import type { ContextAction, ContextResource } from './contextItems'

const itemSelector = '[data-context-item]'
const itemAt = (target: EventTarget | null) => target instanceof Element ? target.closest<HTMLElement>(itemSelector) : null
const itemKey = (item: HTMLElement) => item.dataset.contextItem!
const asResource = (item: HTMLElement): ContextResource => ({
  resource: item.dataset.contextResource!,
  id: item.dataset.contextId!,
  name: item.dataset.contextName!,
})

function itemActions(item: HTMLElement): ContextAction[] {
  const known = new Set<string>()
  const actions: ContextAction[] = []
  if (item.dataset.contextOpen) {
    actions.push({ label: item.dataset.contextOpen, run: () => item.click() })
    known.add(item.dataset.contextOpen)
  }
  for (const control of item.querySelectorAll<HTMLElement>('[data-context-action]')) {
    const label = control.dataset.contextAction
    if (!label || known.has(label) || itemAt(control) !== item || control.matches(':disabled, [aria-disabled="true"]') ||
      (!control.hasAttribute('data-context-command') && (!control.getClientRects().length || getComputedStyle(control).visibility === 'hidden'))) continue
    known.add(label)
    actions.push({ label, run: () => { if (control.isConnected && !control.matches(':disabled, [aria-disabled="true"]')) control.click() },
      danger: control.dataset.contextDanger === 'true' })
  }
  return actions
}

interface Menu {
  x: number
  y: number
  actions: ContextAction[]
  origin: HTMLElement | null
  count: number
}

export default function ItemContextMenu({ children, onCreate }: { children: ReactNode; onCreate: (org: string, resources: ContextResource[]) => void }) {
  const { currentOrg, canWrite } = useApp()
  const [menu, setMenu] = useState<Menu | null>(null)
  const scope = useRef<HTMLDivElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const selection = useRef(new Set<string>())
  const selectionCommands = useRef(new Map<string, SelectionCommands>())
  const registerSelection = useCallback((group: string, commands: SelectionCommands) => {
    selectionCommands.current.set(group, commands)
    return () => {
      if (selectionCommands.current.get(group) === commands) selectionCommands.current.delete(group)
    }
  }, [])

  const renderSelection = () => {
    for (const item of scope.current?.querySelectorAll<HTMLElement>(itemSelector) ?? []) {
      item.toggleAttribute('data-context-selected', selection.current.has(itemKey(item)))
    }
  }

  useEffect(() => {
    const root = scope.current
    if (!root) return
    const observer = new MutationObserver(() => {
      if (!selection.current.size) return
      const visible = new Set(Array.from(root.querySelectorAll<HTMLElement>(itemSelector), itemKey))
      for (const key of selection.current) if (!visible.has(key)) selection.current.delete(key)
      renderSelection()
    })
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (!menu || !popup.current) return
    const node = popup.current
    const rect = node.getBoundingClientRect()
    node.style.left = `${Math.max(8, Math.min(menu.x, window.innerWidth - rect.width - 8))}px`
    node.style.top = `${Math.max(8, Math.min(menu.y, window.innerHeight - rect.height - 8))}px`
    node.querySelector('button')?.focus()
  }, [menu])

  useEffect(() => {
    if (!menu) return
    const dismiss = (event: Event) => {
      if (event.target instanceof Node && popup.current?.contains(event.target)) return
      setMenu(null)
    }
    window.addEventListener('pointerdown', dismiss, true)
    window.addEventListener('scroll', dismiss, true)
    window.addEventListener('resize', dismiss)
    return () => {
      window.removeEventListener('pointerdown', dismiss, true)
      window.removeEventListener('scroll', dismiss, true)
      window.removeEventListener('resize', dismiss)
    }
  }, [menu])

  const toggle = (item: HTMLElement) => {
    const toggleNative = item.querySelector<HTMLElement>('[data-context-toggle-native]')
    if (toggleNative) {
      toggleNative.click()
      return
    }
    const key = itemKey(item)
    if (selection.current.has(key)) selection.current.delete(key)
    else selection.current.add(key)
    renderSelection()
  }
  const clear = () => {
    selection.current.clear()
    for (const control of scope.current?.querySelectorAll<HTMLElement>('[data-context-clear-native]') ?? []) control.click()
    renderSelection()
  }

  const documentAction = (resources: ContextResource[]): ContextAction[] => config.appMode === 'http' && currentOrg && canWrite('operations') && resources.length > 0
    ? [{ label: tr('Create IT document'), run: () => {
      if (resources.length > 50) { window.alert(tr('Select at most 50 items to link to a document.')); return }
      onCreate(currentOrg.id, resources)
    } }]
    : []

  const openItem = (item: HTMLElement, x: number, y: number) => {
    const isSelected = (candidate: HTMLElement) => selection.current.has(itemKey(candidate)) || candidate.hasAttribute('data-context-native-selected')
    const selected = isSelected(item)
    const nativeOnly = item.hasAttribute('data-context-native-selected')
    const matches = selected
      ? Array.from(scope.current?.querySelectorAll<HTMLElement>(itemSelector) ?? [])
          .filter(candidate => isSelected(candidate) && candidate.getClientRects().length)
      : [item]
    const items = [...new Map(matches.map(candidate => [itemKey(candidate), candidate])).values()]
    const linked = items.filter(candidate => candidate.dataset.contextLink).map(asResource)
    const commands = items.length > 1 ? [] : itemActions(item)
    const selectionGroup = item.dataset.contextSelectionGroup
    if (selectionGroup && items.every(candidate => candidate.dataset.contextSelectionGroup === selectionGroup))
      commands.push(...(selectionCommands.current.get(selectionGroup)?.(items.map(asResource)) ?? []))
    const group = item.dataset.contextResource
    if (items.length > 1 && nativeOnly && items.every(candidate => candidate.dataset.contextResource === group && candidate.hasAttribute('data-context-native-selected'))) {
      const bulk = Array.from(scope.current?.querySelectorAll<HTMLElement>('[data-context-bulk-action]') ?? []).find(control =>
        control.dataset.contextBulkAction === group && Number(control.dataset.contextBulkCount) === items.length && !control.matches(':disabled') && control.getClientRects().length)
      if (bulk?.dataset.contextAction) commands.push({ label: bulk.dataset.contextAction, danger: true, run: () => bulk.click() })
    }
    const related = linked.length === items.length ? documentAction(linked) : []
    if (!commands.length && !related.length && !selected) return false
    const actions = [...commands, ...related]
    actions.push({ label: tr(selected ? 'Remove from selection' : 'Add to selection'), run: () => toggle(item) })
    if (selected || selection.current.size) actions.push({ label: tr('Clear selection'), run: clear })
    setMenu({ x, y, actions, origin: item, count: items.length })
    return true
  }

  const openCustom = (event: React.MouseEvent, actions: ContextAction[], resources: ContextResource[] = []) => {
    const commands = [...actions, ...documentAction(resources)]
    if (!commands.length) return
    event.preventDefault()
    event.stopPropagation()
    setMenu({ x: event.clientX, y: event.clientY, actions: commands,
      origin: event.currentTarget instanceof HTMLElement ? event.currentTarget : null, count: resources.length })
  }

  return (
    <ContextActions.Provider value={openCustom}>
    <ContextSelectionActions.Provider value={registerSelection}>
      <div ref={scope} className="contents"
        onContextMenu={event => {
          if (event.defaultPrevented) return
          const item = itemAt(event.target)
          if (item && openItem(item, event.clientX, event.clientY)) event.preventDefault()
        }}
        onClickCapture={event => {
          const item = itemAt(event.target)
          const editing = event.target instanceof Element && event.target.closest('a[href], input, select, textarea, [contenteditable="true"]')
          if (item && (event.ctrlKey || event.metaKey) && !editing) {
            event.preventDefault()
            event.stopPropagation()
            toggle(item)
          }
        }}
        onKeyDown={event => {
          if (event.defaultPrevented) return
          const item = itemAt(event.target)
          if (!item) return
          if (event.target === item && (event.ctrlKey || event.metaKey) && event.code === 'Space') {
            event.preventDefault()
            toggle(item)
            return
          }
          if (!(event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))) return
          const rect = item.getBoundingClientRect()
          if (openItem(item, rect.left + 12, rect.top + 16)) event.preventDefault()
        }}>
        {children}
      </div>
      {menu && createPortal(
        <div role="menu" aria-label={tr('Item actions')} ref={popup}
          className="fixed z-[120] min-w-48 max-w-[calc(100vw-1rem)] max-h-[calc(100vh-1rem)] overflow-auto rounded-lg border border-edge-strong bg-navy-800 py-1 shadow-xl"
          style={{ left: menu.x, top: menu.y }}
          onContextMenu={event => event.preventDefault()}
          onKeyDown={event => {
            if (event.key === 'Delete' || event.key === 'Backspace') event.stopPropagation()
            if (event.key === 'Escape' || event.key === 'Tab') {
              if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation() }
              setMenu(null)
              menu.origin?.focus()
              return
            }
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
            const buttons = Array.from(event.currentTarget.querySelectorAll('button'))
            const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
              : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
            event.preventDefault()
            buttons[next]?.focus()
          }}>
          {menu.count > 1 && <div className="border-b border-edge-subtle px-3 py-1.5 text-xs text-ink-muted">{tr('{{count}} selected items', { count: menu.count })}</div>}
          {menu.actions.map((action, index) => <button key={index} type="button" role="menuitem"
            onClick={() => { setMenu(null); menu.origin?.focus({ preventScroll: true }); action.run() }}
            className={`block w-full px-3 py-2 text-left text-xs hover:bg-navy-700 focus-visible:bg-navy-700 focus-visible:outline-none ${action.danger ? 'text-red-400' : 'text-ink-primary'}`}>
            {action.label}
          </button>)}
        </div>,
        document.body,
      )}
    </ContextSelectionActions.Provider>
    </ContextActions.Provider>
  )
}
