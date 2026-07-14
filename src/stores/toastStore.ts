export interface ToastMessage {
  id: number
  text: string
}

type ToastListener = (toast: ToastMessage | null) => void

let counter = 0
let current: ToastMessage | null = null
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<ToastListener>()

export function showToast(text: string): void {
  current = { id: ++counter, text }
  for (const listener of listeners) listener(current)
  clearTimeout(timer)
  timer = setTimeout(() => {
    current = null
    for (const listener of listeners) listener(null)
  }, 2600)
}

export function getToast(): ToastMessage | null {
  return current
}

export function subscribeToast(listener: ToastListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
