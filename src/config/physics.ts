import type { PhysicsTuning } from '../types/badge'

/**
 * All Matter.js / motion tuning lives here.
 * Raise gravityScale for stronger tilt response, restitution for bouncier bodies.
 */
export const PHYSICS = {
  /** multiplies normalized tilt (−1..1) into Matter gravity units */
  gravityScale: 1.35,
  /** scales shake acceleration (m/s²) into applied force per unit mass */
  motionSensitivity: 0.0016,
  /** hard cap for any applied force per unit mass — keeps bodies from teleporting */
  maxForce: 0.09,
  /** linear acceleration magnitude (m/s²) above which a shake impulse fires */
  shakeThreshold: 12,
  /** 「搖一下」 button impulse per unit mass */
  manualShakeForce: 0.05,
  /** exponential low-pass coefficient for tilt smoothing (0..1, higher = snappier) */
  lowPassAlpha: 0.16,

  /* body material */
  friction: 0.08,
  frictionAir: 0.022,
  restitution: 0.78,
  density: 0.0012,

  /* world */
  /** static wall thickness placed just outside the viewport (thick to prevent tunneling) */
  wallThickness: 200,
  minBodyPx: 40,
  maxBodyPx: 260,
  /** colored outline stroke width as a fraction of body diameter (min 2px) */
  outlineWidthRatio: 0.04,
  /** die-cut sticker margin as a fraction of body diameter (min 3px) */
  stickerMarginRatio: 0.035,
  /** sampling grid resolution when tracing a PNG silhouette for collision */
  alphaHullSamples: 48,
  /** bodies shrink together once their total area exceeds this fraction of the screen.
   *  Governs how tall the settled pile gets: pile height ≈ maxAreaRatio / packing-density
   *  of the screen height. Empirically 0.57 fills ~2/3 of a portrait screen (density ≈0.85). */
  maxAreaRatio: 0.57,
  /** render pixel-ratio cap (fill-rate / battery) */
  maxPixelRatio: 2,
  /** extra sprite-texture resolution baked in so pinch-zoom stays sharp */
  textureZoomHeadroom: 3.5,
  /** hard cap on baked texture edge (px); matches the cropped source size (LIMITS.croppedEdge) */
  maxTexturePx: 512,
  /** speed cap in px/frame so shakes stay lively but controllable */
  maxSpeed: 42,

  /* DVD-screensaver float mode: constant-velocity bounce, no gravity/friction */
  /** constant speed (px/frame) every body is held at while floating */
  dvdSpeed: 3.2,

  /* per-image pinch-zoom (multiplies the stored sizeScale) */
  imagePinchMin: 0.35,
  imagePinchMax: 3.2,
} as const

export type PhysicsConfig = typeof PHYSICS

/** user-facing "feel" knobs — multipliers on the constants above (bounciness is absolute) */
export function defaultPhysicsTuning(): PhysicsTuning {
  return {
    gravity: 1,
    bounciness: PHYSICS.restitution,
    shakeStrength: 1,
    airDrag: 1,
  }
}

/** editor slider ranges for the tuning knobs */
export const TUNING_RANGES = {
  gravity: { min: 0.2, max: 2.5, step: 0.05 },
  bounciness: { min: 0.1, max: 1, step: 0.02 },
  shakeStrength: { min: 0.3, max: 3, step: 0.05 },
  airDrag: { min: 0.2, max: 3, step: 0.05 },
} as const
