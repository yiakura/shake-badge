import { Lock, LockOpen } from 'lucide-react'
import { STAGE } from '../config/stage'
import { t } from '../i18n'

interface StageLockButtonProps {
  locked: boolean
  visible: boolean
  /** consecutive unlock presses so far (0 when not counting) */
  unlockCount: number
  onPress: () => void
}

/** top-right screen-lock button: locks touch, unlocks after 6 consecutive presses */
export function StageLockButton({ locked, visible, unlockCount, onPress }: StageLockButtonProps) {
  const remaining = STAGE.unlockPresses - unlockCount
  return (
    <div
      className={`absolute z-30 top-[calc(env(safe-area-inset-top)+0.75rem)] right-[calc(env(safe-area-inset-right)+0.75rem)]
        flex flex-col items-end gap-1.5 transition-opacity duration-300
        ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <button
        type="button"
        aria-label={locked ? t('stage.locked') : t('stage.lock')}
        aria-pressed={locked}
        onClick={onPress}
        className={`size-11 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-md transition-colors
          ${locked ? 'bg-accent text-white' : 'bg-black/60 text-white active:bg-black/80'}`}
      >
        {locked ? <Lock className="size-5" aria-hidden="true" /> : <LockOpen className="size-5" aria-hidden="true" />}
      </button>
      {locked && (
        <span
          className="rounded-full bg-black/70 text-white text-xs font-bold px-3 py-1 backdrop-blur-md"
          aria-live="polite"
        >
          {unlockCount > 0
            ? t('stage.unlockRemaining', { n: remaining })
            : t('stage.unlockHint', { n: STAGE.unlockPresses })}
        </span>
      )}
    </div>
  )
}
