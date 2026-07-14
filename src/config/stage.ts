/** stage-page interaction constants (screen lock, name gesture) */
export const STAGE = {
  /** controls / lock button fade-out delay (ms of inactivity) */
  autoHideMs: 4000,
  /** consecutive lock-button presses required to unlock */
  unlockPresses: 6,
  /** reset the unlock counter if no press within this window (ms) */
  unlockResetMs: 1600,
  /** snap the dragged name to a center line within this many px */
  nameSnapPx: 22,
  /** name size multiplier bounds when pinch-zooming */
  nameScaleMin: 0.4,
  nameScaleMax: 4,
} as const

/** default normalized name center for a top/bottom preset (before any custom drag) */
export function defaultNameOffset(position: 'top' | 'bottom'): { x: number; y: number } {
  return position === 'top' ? { x: 0.5, y: 0.13 } : { x: 0.5, y: 0.85 }
}
