import { useEffect, useState } from 'react'
import { getToast, subscribeToast, type ToastMessage } from '../stores/toastStore'

export function Toast() {
  const [toast, setToast] = useState<ToastMessage | null>(getToast())

  useEffect(() => subscribeToast(setToast), [])

  if (!toast) return null

  return (
    <div
      key={toast.id}
      role="status"
      className="fixed left-1/2 -translate-x-1/2 z-50 animate-pop
        bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]
        bg-ink text-paper dark:bg-frost dark:text-night
        font-bold text-sm px-5 py-3 rounded-full shadow-lg max-w-[85vw] text-center"
    >
      {toast.text}
    </div>
  )
}
