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

/** default normalized center for a name line, stacking `count` visible lines at the top/bottom anchor */
export function defaultLineOffset(
  position: 'top' | 'bottom',
  index: number,
  count: number,
): { x: number; y: number } {
  const gap = 0.075
  const start = position === 'top' ? 0.11 : 0.84 - (count - 1) * gap
  return { x: 0.5, y: start + index * gap }
}
