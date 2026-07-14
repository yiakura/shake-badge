export interface Vec2 {
  x: number
  y: number
}

export const GRAVITY_MS2 = 9.81

/** exponential low-pass filter — alpha in (0..1], higher follows the input faster */
export function lowPass(prev: Vec2, next: Vec2, alpha: number): Vec2 {
  return {
    x: prev.x + (next.x - prev.x) * alpha,
    y: prev.y + (next.y - prev.y) * alpha,
  }
}

/** clamp vector magnitude to max while keeping its direction */
export function clampMagnitude(v: Vec2, max: number): Vec2 {
  const magnitude = Math.hypot(v.x, v.y)
  if (magnitude <= max || magnitude === 0) return v
  const scale = max / magnitude
  return { x: v.x * scale, y: v.y * scale }
}

/**
 * Rotate a vector from the device's natural (portrait) screen frame into the
 * current screen frame, given screen.orientation.angle in degrees.
 */
export function remapForOrientation(v: Vec2, angleDeg: number): Vec2 {
  const angle = ((Math.round(angleDeg / 90) * 90) % 360 + 360) % 360
  switch (angle) {
    case 90:
      return { x: v.y, y: -v.x }
    case 180:
      return { x: -v.x, y: -v.y }
    case 270:
      return { x: -v.y, y: v.x }
    default:
      return { x: v.x, y: v.y }
  }
}

/**
 * Convert a DeviceMotion vector (device frame, spec convention) into a
 * CSS-screen-frame vector (+x right, +y down).
 *
 * For accelerationIncludingGravity this yields the direction things should
 * fall; per spec the sensor reports the reaction force (device flat on a
 * table → z = +9.81), while iOS historically reports the mirrored sign —
 * pass flip=true there.
 */
export function motionVectorToScreen(v: Vec2, orientationAngleDeg: number, flip: boolean): Vec2 {
  const sign = flip ? 1 : -1
  const devicePortraitFrame = { x: sign * v.x, y: -sign * v.y }
  return remapForOrientation(devicePortraitFrame, orientationAngleDeg)
}

/** normalized screen-frame gravity (−1..1 per axis) from accelerationIncludingGravity */
export function tiltToScreenGravity(
  accelIncludingGravity: Vec2,
  orientationAngleDeg: number,
  flip: boolean,
): Vec2 {
  const screen = motionVectorToScreen(accelIncludingGravity, orientationAngleDeg, flip)
  return { x: screen.x / GRAVITY_MS2, y: screen.y / GRAVITY_MS2 }
}
