import { PHYSICS } from '../config/physics'
import {
  clampMagnitude,
  lowPass,
  motionVectorToScreen,
  tiltToScreenGravity,
  type Vec2,
} from '../utils/motionMath'

export interface MotionSample {
  /** smoothed screen-frame gravity, roughly −1..1 per axis */
  gravity: Vec2
  /** screen-frame linear acceleration (m/s²) */
  shake: Vec2
  /** total linear acceleration magnitude incl. z (m/s²) */
  shakeMagnitude: number
}

type MotionCallback = (sample: MotionSample) => void

interface MotionEventCtorWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

export function isMotionSupported(): boolean {
  return typeof window !== 'undefined' && 'DeviceMotionEvent' in window
}

/** iOS 13+ gates the sensor behind a user-gesture permission prompt */
export function needsMotionPermission(): boolean {
  if (!isMotionSupported()) return false
  const ctor = DeviceMotionEvent as unknown as MotionEventCtorWithPermission
  return typeof ctor.requestPermission === 'function'
}

/** must be called from a user gesture (click/tap) */
export async function requestMotionPermission(): Promise<'granted' | 'denied'> {
  const ctor = DeviceMotionEvent as unknown as MotionEventCtorWithPermission
  if (typeof ctor.requestPermission !== 'function') return 'granted'
  try {
    return await ctor.requestPermission()
  } catch {
    return 'denied'
  }
}

/**
 * iOS reports accelerationIncludingGravity with the sign mirrored relative to
 * the spec. This convention is not feature-detectable, so this is the one spot
 * where the platform is sniffed.
 */
export function isAppleMotionPlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function orientationAngle(): number {
  if (typeof screen !== 'undefined' && screen.orientation) return screen.orientation.angle
  const legacy = (window as Window & { orientation?: number }).orientation
  return typeof legacy === 'number' ? legacy : 0
}

export class DeviceMotionService {
  /** fires when the API exists but never delivers usable data (e.g. desktop) */
  onNoData: (() => void) | null = null

  private callback: MotionCallback | null = null
  private smoothed: Vec2 = { x: 0, y: 1 } // resting state: plain downward gravity
  private watchdog: ReturnType<typeof setTimeout> | undefined
  private gotData = false
  private readonly flip = isAppleMotionPlatform()
  private readonly handler = (event: DeviceMotionEvent) => this.onMotion(event)

  start(callback: MotionCallback): void {
    this.stop()
    this.callback = callback
    this.gotData = false
    window.addEventListener('devicemotion', this.handler)
    this.watchdog = setTimeout(() => {
      if (!this.gotData) this.onNoData?.()
    }, 1500)
  }

  stop(): void {
    window.removeEventListener('devicemotion', this.handler)
    clearTimeout(this.watchdog)
    this.callback = null
  }

  private onMotion(event: DeviceMotionEvent): void {
    const withGravity = event.accelerationIncludingGravity
    // some desktop browsers fire the event with null axes — that still counts as "no data"
    if (!withGravity || withGravity.x == null || withGravity.y == null) return
    this.gotData = true

    const angle = orientationAngle()
    const target = tiltToScreenGravity({ x: withGravity.x, y: withGravity.y }, angle, this.flip)
    this.smoothed = lowPass(this.smoothed, target, PHYSICS.lowPassAlpha)
    // shaking briefly inflates readings past 1g — allow some headroom, then cap
    const gravity = clampMagnitude(this.smoothed, 1.4)

    let shake: Vec2 = { x: 0, y: 0 }
    let shakeMagnitude = 0
    const linear = event.acceleration
    if (linear && linear.x != null && linear.y != null) {
      shake = motionVectorToScreen({ x: linear.x, y: linear.y }, angle, this.flip)
      shakeMagnitude = Math.hypot(linear.x, linear.y, linear.z ?? 0)
    }

    this.callback?.({ gravity, shake, shakeMagnitude })
  }
}
