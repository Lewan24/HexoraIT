import { createContext, useContext, useEffect } from 'react'
import type { ContextAction, ContextResource } from './contextItems'

export const ContextActions = createContext<(event: React.MouseEvent, actions: ContextAction[], resources?: ContextResource[]) => void>(() => {})
export const useContextActions = () => useContext(ContextActions)

export type SelectionCommands = (items: ContextResource[]) => ContextAction[]
export const ContextSelectionActions = createContext<(group: string, commands: SelectionCommands) => () => void>(() => () => {})

export function useContextSelectionActions(group: string, commands: SelectionCommands) {
  const register = useContext(ContextSelectionActions)
  useEffect(() => register(group, commands), [register, group, commands])
}
