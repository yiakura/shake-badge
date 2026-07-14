import { useEffect, useRef } from 'react'
import { t } from '../i18n'

interface ConfirmDialogProps {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade" role="presentation">
      <div className="absolute inset-0 bg-black/55" onClick={onCancel} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative card p-6 w-full max-w-sm animate-pop"
      >
        <h2 id="confirm-title" className="text-lg font-extrabold">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft dark:text-frost-soft">{body}</p>
        <div className="mt-6 flex gap-3">
          <button ref={cancelRef} type="button" className="btn btn-secondary flex-1" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-danger flex-1" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
