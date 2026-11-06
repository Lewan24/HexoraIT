import { useEffect, useRef, useState, type PointerEvent } from "react"
import type { TaskStatus } from "../api/types"

export const TASK_STATUSES: TaskStatus[] = ["todo", "in-progress", "done"]
export function taskDropTarget(element: Element | null): TaskStatus | null {
  const value =
    element?.closest<HTMLElement>("[data-task-status]")?.dataset.taskStatus
  return TASK_STATUSES.includes(value as TaskStatus)
    ? value as TaskStatus
    : null
}

export function useTaskDrag(onDrop: (id: string, status: TaskStatus) => void) {
  const [drag, setDrag] = useState<{
    id: string
    x: number
    y: number
    target: TaskStatus | null
  } | null>(null)
  const gesture = useRef<{
    id: string
    x: number
    y: number
    startX: number
    startY: number
    active: boolean
  } | null>(null)
  const frame = useRef<number>(0)
  const cancel = () => {
    gesture.current = null
    cancelAnimationFrame(frame.current)
    setDrag(null)
  }
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        gesture.current = null
        cancelAnimationFrame(frame.current)
        setDrag(null)
      }
    }
    window.addEventListener("keydown", key)
    return () => {
      window.removeEventListener("keydown", key)
      gesture.current = null
      cancelAnimationFrame(frame.current)
    }
  }, [])
  const bindings = (id: string) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0 || !event.isPrimary || gesture.current) return
      event.currentTarget.setPointerCapture(event.pointerId)
      gesture.current = {
        id,
        x: event.clientX,
        y: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
        active: false,
      }
      const scroll = () => {
        const current = gesture.current
        if (!current) return
        if (current.active) {
          const element = document.elementFromPoint(current.x, current.y)
          const list = element?.closest<HTMLElement>("[data-task-scroll]")
          if (list) {
            const rect = list.getBoundingClientRect(),
              zone = 48
            if (current.y < rect.top + zone)
              list.scrollTop -= Math.min(14, (rect.top + zone - current.y) / 3)
            if (current.y > rect.bottom - zone)
              list.scrollTop += Math.min(
                14,
                (current.y - rect.bottom + zone) / 3,
              )
          }
        }
        frame.current = requestAnimationFrame(scroll)
      }
      frame.current = requestAnimationFrame(scroll)
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      const current = gesture.current
      if (!current || current.id !== id) return
      current.x = event.clientX
      current.y = event.clientY
      if (
        !current.active &&
        Math.hypot(current.x - current.startX, current.y - current.startY) < 6
      )
        return
      current.active = true
      setDrag({
        id,
        x: current.x,
        y: current.y,
        target: taskDropTarget(document.elementFromPoint(current.x, current.y)),
      })
    },
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
      const current = gesture.current
      const target = taskDropTarget(
        document.elementFromPoint(event.clientX, event.clientY),
      )
      cancel()
      if (current?.active && target) onDrop(current.id, target)
    },
    onPointerCancel: cancel,
    onLostPointerCapture: cancel,
  })
  return { drag, bindings }
}
