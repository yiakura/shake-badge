import { useCallback, useEffect, useRef, useState } from 'react'
import { navigate } from '../hooks/useHashRoute'
import { useBadgeStore } from '../stores/badgeStore'
import { backgroundCss } from '../config/themes'
import { PHYSICS } from '../config/physics'
import { PhysicsController } from '../services/physics'
import {
  DeviceMotionService,
  isMotionSupported,
  needsMotionPermission,
  requestMotionPermission,
  type MotionSample,
} from '../services/motion'
import { useWakeLock } from '../hooks/useWakeLock'
import { useFullscreen } from '../hooks/useFullscreen'
import { useAutoHide } from '../hooks/useAutoHide'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { StageControlBar } from '../components/StageControlBar'
import { MotionPermissionOverlay } from '../components/MotionPermissionOverlay'
import { nameFontFamily } from '../services/fontService'
import { nameTextShadow } from '../utils/badgeText'
import { showToast } from '../stores/toastStore'
import { debounce } from '../utils/debounce'
import { t } from '../i18n'

type MotionUiState =
  | 'unsupported'
  | 'need-permission'
  | 'denied'
  | 'active'
  | 'paused'
  | 'no-data'

export function StagePage() {
  const { settings, images, backgroundImage } = useBadgeStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<PhysicsController | null>(null)
  const motionRef = useRef<DeviceMotionService | null>(null)
  const tapRef = useRef<{ x: number; y: number; time: number } | null>(null)

  const [motionUi, setMotionUi] = useState<MotionUiState>('paused')
  const [nameShown, setNameShown] = useState(settings.showName)
  const [wakeEnabled, setWakeEnabled] = useState(true)
  const [floatOn, setFloatOn] = useState(false)

  const hasImages = images.length > 0
  const { supported: wakeSupported, active: wakeActive } = useWakeLock(wakeEnabled && hasImages)
  const fullscreen = useFullscreen()
  const controls = useAutoHide(4000)

  // sensor data flows straight into the physics engine — never through React state
  const feedPhysics = useCallback((sample: MotionSample) => {
    const controller = controllerRef.current
    if (!controller) return
    controller.setGravity(sample.gravity)
    if (sample.shakeMagnitude > PHYSICS.shakeThreshold) {
      controller.applyMotionShake(sample.shake, sample.shakeMagnitude)
    }
  }, [])

  // guard: nothing to show → back to the editor
  useEffect(() => {
    if (!hasImages) navigate('edit')
  }, [hasImages])

  // physics world lifecycle
  useEffect(() => {
    const element = containerRef.current
    if (!element || images.length === 0) return
    const controller = new PhysicsController()
    controllerRef.current = controller
    void controller.start(
      element,
      images.map((record) => ({
        id: record.id,
        blob: record.croppedBlob,
        sizeScale: record.sizeScale,
        shapeMode: record.shapeMode,
        hasAlpha: record.hasAlpha,
      })),
      {
        shape: settings.imageShape,
        basePercent: settings.imageBasePercent,
        outline: { mode: settings.imageOutline, color: settings.imageOutlineColor },
        tuning: settings.physics,
      },
    )

    const onResize = debounce(() => {
      controller.resize(element.clientWidth, element.clientHeight)
    }, 150)
    const observer = new ResizeObserver(onResize)
    observer.observe(element)

    controller.setFloatMode(floatOn) // preserve the toggle across world rebuilds

    return () => {
      observer.disconnect()
      onResize.cancel()
      controller.destroy()
      controllerRef.current = null
    }
    // floatOn intentionally excluded — a dedicated effect toggles it without a rebuild
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    images,
    settings.imageShape,
    settings.imageBasePercent,
    settings.imageOutline,
    settings.imageOutlineColor,
    settings.physics,
  ])

  // toggle float without tearing down the physics world
  useEffect(() => {
    controllerRef.current?.setFloatMode(floatOn)
  }, [floatOn])

  // device motion lifecycle
  useEffect(() => {
    if (!isMotionSupported()) {
      setMotionUi('unsupported')
      showToast(t('stage.motionUnsupported'))
      return
    }
    const service = new DeviceMotionService()
    motionRef.current = service
    service.onNoData = () => {
      service.stop()
      setMotionUi('no-data')
      showToast(t('stage.motionUnsupported'))
    }
    if (needsMotionPermission()) {
      setMotionUi('need-permission')
    } else {
      service.start(feedPhysics)
      setMotionUi('active')
    }
    return () => {
      service.stop()
      motionRef.current = null
    }
  }, [feedPhysics])

  async function enableMotion(): Promise<void> {
    const service = motionRef.current
    if (!service) return
    const result = await requestMotionPermission()
    if (result === 'granted') {
      service.start(feedPhysics)
      setMotionUi('active')
    } else {
      setMotionUi('denied')
    }
  }

  const { style } = settings
  const stageBgUrl = useObjectUrl(style.background.type === 'image' ? backgroundImage : null)
  const nameLines = [settings.name, settings.nameLine2].filter((line) => line.trim().length > 0)
  const showNameOverlay = nameShown && nameLines.length > 0

  if (!hasImages) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center text-ink-soft dark:text-frost-soft">
        {t('stage.notReady')}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={
        style.background.type === 'image' && stageBgUrl
          ? {
              backgroundColor: style.background.from,
              backgroundImage: `url(${stageBgUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : { background: backgroundCss(style.background) }
      }
    >
      {/* physics canvas host — taps (without drags) reveal the controls */}
      <div
        ref={containerRef}
        data-testid="stage-canvas"
        className="absolute inset-0 touch-none"
        onPointerDown={(event) => {
          tapRef.current = { x: event.clientX, y: event.clientY, time: Date.now() }
        }}
        onPointerUp={(event) => {
          const start = tapRef.current
          tapRef.current = null
          if (!start) return
          const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y)
          if (distance < 12 && Date.now() - start.time < 500) controls.poke()
        }}
      />

      {showNameOverlay && (
        <div
          className={`absolute inset-x-0 z-10 pointer-events-none flex justify-center px-6
            ${settings.namePosition === 'top'
              ? 'top-[calc(env(safe-area-inset-top)+1.75rem)]'
              : 'bottom-[calc(env(safe-area-inset-bottom)+6.5rem)]'}`}
        >
          <div
            className={`font-display font-extrabold text-center
              ${settings.nameDirection === 'vertical' ? '[writing-mode:vertical-rl] max-h-[62vh]' : 'break-all max-w-full'}`}
            style={{
              fontSize: style.fontSizePx,
              color: style.textColor,
              fontFamily: nameFontFamily(settings.customFontName),
              textShadow: nameTextShadow({
                outline: settings.nameShadow,
                outlinePx: Math.max(1, Math.round(style.fontSizePx / 28)),
                glow: style.nameGlow,
                glowBlur: [14, 40],
                fallback: '0 1px 12px rgba(0,0,0,0.25)',
              }),
            }}
          >
            {nameLines.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {(motionUi === 'need-permission' || motionUi === 'denied') && (
        <MotionPermissionOverlay
          mode={motionUi === 'denied' ? 'denied' : 'ask'}
          onEnable={() => void enableMotion()}
          onDismiss={() => setMotionUi('paused')}
        />
      )}

      <StageControlBar
        visible={controls.visible}
        floatOn={floatOn}
        wakeSupported={wakeSupported}
        wakeActive={wakeActive}
        fullscreenSupported={fullscreen.supported}
        fullscreenActive={fullscreen.active}
        nameShown={nameShown}
        onBack={() => navigate('edit')}
        onToggleFloat={() => setFloatOn((on) => !on)}
        onShake={() => controllerRef.current?.shakeAll()}
        onReset={() => controllerRef.current?.resetPositions()}
        onToggleFullscreen={fullscreen.toggle}
        onToggleWake={() => setWakeEnabled((enabled) => !enabled)}
        onToggleName={() => setNameShown((shown) => !shown)}
        onInteract={controls.poke}
      />
    </div>
  )
}
