import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from './confirm-context'

/**
 * Replaces the browser's confirm() box with a modal dialog in the app's style.
 * It uses the native <dialog> element, so focus stays inside, Escape cancels and the page behind is inert.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((next) => {
    // A second request while one is open counts as a cancel for the first.
    resolveRef.current?.(false)
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setOptions(next)
    })
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (options && !dialog.open) dialog.showModal()
    if (!options && dialog.open) dialog.close()
  }, [options])

  function finish(confirmed: boolean) {
    resolveRef.current?.(confirmed)
    resolveRef.current = null
    setOptions(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        className="dialog"
        aria-labelledby="confirm-title"
        aria-describedby={options?.message ? 'confirm-message' : undefined}
        onCancel={(event) => {
          event.preventDefault()
          finish(false)
        }}
        onClick={(event) => {
          // A click on the dim backdrop lands on the dialog element itself.
          if (event.target === event.currentTarget) finish(false)
        }}
      >
        {options && (
          <div className="dialog__body">
            <h2 id="confirm-title">{options.title}</h2>
            {options.message && <p id="confirm-message">{options.message}</p>}
            <div className="dialog__actions">
              <button type="button" className="button button--quiet" onClick={() => finish(false)}>
                {options.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                className={options.danger ? 'button button--danger-solid' : 'button'}
                onClick={() => finish(true)}
              >
                {options.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  )
}
