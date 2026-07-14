import { useCallback, useEffect, useRef, useState } from 'react'
import { navigate } from '../hooks/useHashRoute'
import {
  persistSettings,
  updateImage,
  updateSettings,
  useBadgeStore,
} from '../stores/badgeStore'
import { backgroundCss } from '../config/themes'
import { PHYSICS } from '../config/physics'
import { STAGE, defaultLineOffset } from '../config/stage'
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
import { useStageGestures } from '../hooks/useStageGestures'
import { StageControlBar } from '../components/StageControlBar'
import { StageLockButton } from '../components/StageLockButton'
import { MotionPermissionOverlay } from '../components/MotionPermissionOverlay'
import { nameFontFamily } from '../services/fontService'
import { nameTextShadow } from '../utils/badgeText'
import { showToast } from '../stores/toastStore'
import { debounce } from '../utils/debounce'
import { t } from '../i18n'

type MotionUiState = 'unsupported' | 'need-permission' | 'denied' | 'active' | 'paused' | 'no-data'

export function StagePage() {
  const { settings, images, backgroundImage } = useBadgeStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<PhysicsController | null>(null)
  const motionRef = useRef<DeviceMotionService | null>(null)
  const nameLineEls = useRef(new Map<number, HTMLDivElement>())
  const unlockTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const [motionUi, setMotionUi] = useState<MotionUiState>('paused')
  const [nameShown, setNameShown] = useState(settings.showName)
  const [wakeEnabled, setWakeEnabled] = useState(true)
  const [floatOn, setFloatOn] = useState(false)
  const [locked, setLocked] = useState(false)
  const [unlockCount, setUnlockCount] = useState(0)

  const hasImages = images.length > 0
  const { supported: wakeSupported, active: wakeActive } = useWakeLock(wakeEnabled && hasImages)
  const fullscreen = useFullscreen()
  const controls = useAutoHide(STAGE.autoHideMs)

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

  // physics world lifecycle — rebuild only when the image set/order or layout changes,
  // NOT when a single image's size changes (pinch applies live to the existing body)
  const imageKey = images.map((record) => record.id).join('|')
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    imageKey,
    settings.imageShape,
    settings.imageBasePercent,
    settings.imageOutline,
    settings.imageOutlineColor,
    settings.physics,
  ])

  // toggle DVD-bounce mode without tearing down the physics world
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
  // visible name lines: index 0 = name, 1 = nameLine2 (each positioned/scaled independently)
  const visibleLines = [
    { role: 0, text: settings.name },
    { role: 1, text: settings.nameLine2 },
  ].filter((line) => line.text.trim().length > 0)
  const showNameOverlay = nameShown && visibleLines.length > 0
  const overlayUp = motionUi === 'need-permission' || motionUi === 'denied'

  const setLineEl = (role: number) => (el: HTMLDivElement | null) => {
    if (el) nameLineEls.current.set(role, el)
    else nameLineEls.current.delete(role)
  }

  // two-finger gestures: pinch an image, or drag + pinch a single name line (center-line snap)
  useStageGestures({
    hostRef: containerRef,
    controllerRef,
    enabled: !locked && !overlayUp,
    fontBasePx: style.fontSizePx,
    hitNameLine: (x, y) => {
      let best: { index: number; el: HTMLElement; scale: number } | null = null
      let bestDist = Infinity
      const pad = 24
      for (const [role, el] of nameLineEls.current) {
        const r = el.getBoundingClientRect()
        if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) {
          const d = Math.hypot(x - (r.left + r.right) / 2, y - (r.top + r.bottom) / 2)
          if (d < bestDist) {
            bestDist = d
            best = { index: role, el, scale: settings.nameLayout[role]?.scale ?? 1 }
          }
        }
      }
      return best
    },
    getImageSizeScale: (id) => images.find((record) => record.id === id)?.sizeScale ?? 1,
    onReveal: () => controls.poke(),
    onNameCommit: (index, offset, scale) => {
      const nameLayout = settings.nameLayout.map((line, i) => (i === index ? { offset, scale } : line))
      updateSettings({ nameLayout })
      void persistSettings()
    },
    onImageCommit: (imageId, sizeScale) => {
      const record = images.find((r) => r.id === imageId)
      if (record) void updateImage({ ...record, sizeScale })
    },
  })

  function pressLock(): void {
    controls.poke()
    if (!locked) {
      setLocked(true)
      setUnlockCount(0)
      return
    }
    setUnlockCount((prev) => {
      const next = prev + 1
      clearTimeout(unlockTimer.current)
      if (next >= STAGE.unlockPresses) {
        setLocked(false)
        return 0
      }
      unlockTimer.current = setTimeout(() => setUnlockCount(0), STAGE.unlockResetMs)
      return next
    })
  }

  useEffect(() => () => clearTimeout(unlockTimer.current), [])

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
      {/* physics canvas host — canvas touch is disabled while locked */}
      <div
        ref={containerRef}
        data-testid="stage-canvas"
        className={`absolute inset-0 touch-none ${locked ? '[&>canvas]:pointer-events-none' : ''}`}
      />

      {showNameOverlay &&
        visibleLines.map((line, i) => {
          const layout = settings.nameLayout[line.role] ?? { offset: null, scale: 1 }
          const off = layout.offset ?? defaultLineOffset(settings.namePosition, i, visibleLines.length)
          const size = style.fontSizePx * layout.scale
          return (
            <div
              key={line.role}
              ref={setLineEl(line.role)}
              data-testid={`stage-name-${line.role}`}
              className={`absolute z-10 pointer-events-none font-display font-extrabold text-center -translate-x-1/2 -translate-y-1/2
                ${settings.nameDirection === 'vertical' ? '[writing-mode:vertical-rl] max-h-[62vh]' : 'break-words max-w-[86vw]'}`}
              style={{
                left: `${off.x * 100}%`,
                top: `${off.y * 100}%`,
                fontSize: size,
                color: style.textColor,
                fontFamily: nameFontFamily(settings.customFontName),
                textShadow: nameTextShadow({
                  outline: settings.nameShadow,
                  outlinePx: Math.max(1, Math.round(size / 28)),
                  glow: style.nameGlow,
                  glowBlur: [14, 40],
                  fallback: '0 1px 12px rgba(0,0,0,0.25)',
                }),
              }}
            >
              {line.text}
            </div>
          )
        })}

      {overlayUp && (
        <MotionPermissionOverlay
          mode={motionUi === 'denied' ? 'denied' : 'ask'}
          onEnable={() => void enableMotion()}
          onDismiss={() => setMotionUi('paused')}
        />
      )}

      <StageLockButton locked={locked} visible={controls.visible} unlockCount={unlockCount} onPress={pressLock} />

      {!locked && (
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
      )}
    </div>
  )
}
