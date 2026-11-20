import { createContext } from 'react'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Use for deletes and other things that can't be undone: the confirm button turns red. */
  danger?: boolean
}

/** Opens the confirmation dialog and resolves true if the person confirms, false if they cancel. */
export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

export const ConfirmContext = createContext<ConfirmFn | null>(null)
