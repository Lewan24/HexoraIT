import { useEffect, useRef } from "react"

export function useDialogFocus() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    if (!dialog.contains(document.activeElement)) dialog.focus()
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return
      const controls = [
        ...dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
        ),
      ].filter((element) => element.getClientRects().length > 0)
      const first = controls[0],
        last = controls.at(-1)
      if (!first || !last) {
        event.preventDefault()
        return
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        event.preventDefault()
        last.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === dialog)
      ) {
        event.preventDefault()
        first.focus()
      }
    }
    dialog.addEventListener("keydown", trap)
    return () => {
      dialog.removeEventListener("keydown", trap)
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return ref
}
