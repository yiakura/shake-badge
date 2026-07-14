import { Vibrate } from 'lucide-react'
import { t } from '../i18n'

interface MotionPermissionOverlayProps {
  mode: 'ask' | 'denied'
  onEnable: () => void
  onDismiss: () => void
}

/** iOS motion-permission gate: the sensor only unlocks after a user tap */
export function MotionPermissionOverlay({ mode, onEnable, onDismiss }: MotionPermissionOverlayProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/50 animate-fade">
      <div role="dialog" aria-modal="true" className="card p-6 w-full max-w-sm text-center animate-pop">
        <span className="mx-auto size-14 rounded-full bg-accent/15 text-accent flex items-center justify-center">
          <Vibrate className="size-7" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-extrabold">{t('stage.enableMotion')}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft dark:text-frost-soft">
          {mode === 'ask' ? t('stage.motionExplain') : t('stage.motionDenied')}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {mode === 'ask' ? (
            <>
              <button type="button" className="btn btn-primary w-full" onClick={onEnable}>
                {t('stage.enableMotion')}
              </button>
              <button type="button" className="btn btn-ghost w-full" onClick={onDismiss}>
                {t('stage.later')}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-secondary w-full" onClick={onDismiss}>
              {t('stage.gotIt')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
