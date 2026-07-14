import { RotateCcw } from 'lucide-react'
import { TUNING_RANGES, defaultPhysicsTuning } from '../config/physics'
import type { PhysicsTuning } from '../types/badge'
import { updateSettings, useBadgeStore } from '../stores/badgeStore'
import { Slider } from './Slider'
import { t } from '../i18n'

const times = (v: number) => `× ${v.toFixed(2)}`
const percent = (v: number) => `${Math.round(v * 100)}%`

/** user-facing physics feel sliders — applied when the stage starts */
export function PhysicsControls() {
  const { settings } = useBadgeStore()
  const tuning = settings.physics

  function patch(partial: Partial<PhysicsTuning>): void {
    updateSettings({ physics: { ...tuning, ...partial } })
  }

  return (
    <div className="flex flex-col gap-5">
      <Slider
        label={t('physics.gravity')}
        min={TUNING_RANGES.gravity.min}
        max={TUNING_RANGES.gravity.max}
        step={TUNING_RANGES.gravity.step}
        value={tuning.gravity}
        onChange={(gravity) => patch({ gravity })}
        format={times}
      />
      <Slider
        label={t('physics.bounciness')}
        min={TUNING_RANGES.bounciness.min}
        max={TUNING_RANGES.bounciness.max}
        step={TUNING_RANGES.bounciness.step}
        value={tuning.bounciness}
        onChange={(bounciness) => patch({ bounciness })}
        format={percent}
      />
      <Slider
        label={t('physics.shakeStrength')}
        min={TUNING_RANGES.shakeStrength.min}
        max={TUNING_RANGES.shakeStrength.max}
        step={TUNING_RANGES.shakeStrength.step}
        value={tuning.shakeStrength}
        onChange={(shakeStrength) => patch({ shakeStrength })}
        format={times}
      />
      <Slider
        label={t('physics.airDrag')}
        min={TUNING_RANGES.airDrag.min}
        max={TUNING_RANGES.airDrag.max}
        step={TUNING_RANGES.airDrag.step}
        value={tuning.airDrag}
        onChange={(airDrag) => patch({ airDrag })}
        format={times}
      />
      <p className="text-xs text-ink-soft dark:text-frost-soft -mt-1">{t('physics.hint')}</p>
      <button
        type="button"
        className="btn btn-ghost self-start -ml-4"
        onClick={() => updateSettings({ physics: defaultPhysicsTuning() })}
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        {t('physics.reset')}
      </button>
    </div>
  )
}
