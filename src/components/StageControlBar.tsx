import type { ReactNode } from 'react'
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lightbulb,
  LightbulbOff,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react'
import { t } from '../i18n'

interface BarButtonProps {
  label: string
  onClick: () => void
  active?: boolean
  children: ReactNode
}

function BarButton({ label, onClick, active = false, children }: BarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={`size-11 rounded-full flex items-center justify-center transition-colors
        active:bg-white/20 ${active ? 'text-sun' : 'text-white'}`}
    >
      {children}
    </button>
  )
}

interface StageControlBarProps {
  visible: boolean
  floatOn: boolean
  wakeSupported: boolean
  wakeActive: boolean
  fullscreenSupported: boolean
  fullscreenActive: boolean
  nameShown: boolean
  onBack: () => void
  onToggleFloat: () => void
  onShake: () => void
  onReset: () => void
  onToggleFullscreen: () => void
  onToggleWake: () => void
  onToggleName: () => void
  /** resets the auto-hide timer on every interaction */
  onInteract: () => void
}

export function StageControlBar(props: StageControlBarProps) {
  const act = (fn: () => void) => () => {
    props.onInteract()
    fn()
  }

  return (
    <div
      data-testid="stage-controls"
      className={`absolute inset-x-0 bottom-0 z-20 flex justify-center
        pb-[calc(env(safe-area-inset-bottom)+0.875rem)] px-4
        transition-[opacity,transform] duration-300
        ${props.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}
    >
      <div className="flex items-center gap-0.5 rounded-full bg-black/60 backdrop-blur-md px-2 py-1.5 shadow-2xl">
        <BarButton label={t('stage.backToEdit')} onClick={act(props.onBack)}>
          <ArrowLeft className="size-5" aria-hidden="true" />
        </BarButton>

        <BarButton
          label={props.floatOn ? t('stage.floatOn') : t('stage.floatOff')}
          active={props.floatOn}
          onClick={act(props.onToggleFloat)}
        >
          <Sparkles className="size-5" aria-hidden="true" />
        </BarButton>

        <BarButton label={t('stage.shakeBtn')} onClick={act(props.onShake)}>
          <Zap className="size-5" aria-hidden="true" />
        </BarButton>

        <BarButton label={t('stage.resetBtn')} onClick={act(props.onReset)}>
          <RotateCcw className="size-5" aria-hidden="true" />
        </BarButton>

        {props.fullscreenSupported && (
          <BarButton
            label={props.fullscreenActive ? t('stage.fullscreenOff') : t('stage.fullscreenOn')}
            active={props.fullscreenActive}
            onClick={act(props.onToggleFullscreen)}
          >
            {props.fullscreenActive ? (
              <Minimize2 className="size-5" aria-hidden="true" />
            ) : (
              <Maximize2 className="size-5" aria-hidden="true" />
            )}
          </BarButton>
        )}

        {props.wakeSupported && (
          <BarButton
            label={props.wakeActive ? t('stage.wakeOn') : t('stage.wakeOff')}
            active={props.wakeActive}
            onClick={act(props.onToggleWake)}
          >
            {props.wakeActive ? (
              <Lightbulb className="size-5" aria-hidden="true" />
            ) : (
              <LightbulbOff className="size-5" aria-hidden="true" />
            )}
          </BarButton>
        )}

        <BarButton
          label={props.nameShown ? t('stage.hideNameBtn') : t('stage.showNameBtn')}
          active={props.nameShown}
          onClick={act(props.onToggleName)}
        >
          {props.nameShown ? (
            <Eye className="size-5" aria-hidden="true" />
          ) : (
            <EyeOff className="size-5" aria-hidden="true" />
          )}
        </BarButton>
      </div>
    </div>
  )
}
