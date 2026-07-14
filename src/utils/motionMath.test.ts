import { describe, expect, it } from 'vitest'
import {
  clampMagnitude,
  lowPass,
  remapForOrientation,
  tiltToScreenGravity,
  type Vec2,
} from './motionMath'

const close = (v: Vec2, expected: Vec2) => {
  expect(v.x).toBeCloseTo(expected.x, 6)
  expect(v.y).toBeCloseTo(expected.y, 6)
}

describe('lowPass', () => {
  it('returns the target immediately when alpha is 1', () => {
    close(lowPass({ x: 0, y: 0 }, { x: 5, y: -3 }, 1), { x: 5, y: -3 })
  })

  it('moves halfway when alpha is 0.5', () => {
    close(lowPass({ x: 0, y: 0 }, { x: 10, y: 4 }, 0.5), { x: 5, y: 2 })
  })

  it('converges toward the target under repeated application', () => {
    let v: Vec2 = { x: 0, y: 0 }
    for (let i = 0; i < 60; i++) v = lowPass(v, { x: 1, y: -1 }, 0.15)
    expect(v.x).toBeGreaterThan(0.99)
    expect(v.y).toBeLessThan(-0.99)
  })

  it('smooths jitter: a single outlier sample barely moves the output', () => {
    const v = lowPass({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.1)
    expect(v.x).toBe(10)
  })
})

describe('clampMagnitude', () => {
  it('keeps vectors within the limit unchanged', () => {
    close(clampMagnitude({ x: 3, y: 4 }, 10), { x: 3, y: 4 })
  })

  it('scales oversized vectors down to max, preserving direction', () => {
    const clamped = clampMagnitude({ x: 30, y: 40 }, 5)
    close(clamped, { x: 3, y: 4 })
    expect(Math.hypot(clamped.x, clamped.y)).toBeCloseTo(5, 6)
  })

  it('handles the zero vector', () => {
    close(clampMagnitude({ x: 0, y: 0 }, 5), { x: 0, y: 0 })
  })
})

describe('remapForOrientation', () => {
  it('is identity at 0°', () => {
    close(remapForOrientation({ x: 1, y: 0.5 }, 0), { x: 1, y: 0.5 })
  })

  it('rotates for 90° / 180° / 270°', () => {
    close(remapForOrientation({ x: 1, y: 0 }, 90), { x: 0, y: -1 })
    close(remapForOrientation({ x: 1, y: 0 }, 180), { x: -1, y: 0 })
    close(remapForOrientation({ x: 1, y: 0 }, 270), { x: 0, y: 1 })
  })

  it('treats negative angles like their positive equivalent', () => {
    close(remapForOrientation({ x: 1, y: 0 }, -90), remapForOrientation({ x: 1, y: 0 }, 270))
  })

  it('rounds near-multiples of 90', () => {
    close(remapForOrientation({ x: 1, y: 0 }, 87), remapForOrientation({ x: 1, y: 0 }, 90))
  })
})

describe('tiltToScreenGravity — physical scenarios', () => {
  it('Android portrait upright → things fall toward the screen bottom', () => {
    close(tiltToScreenGravity({ x: 0, y: 9.81 }, 0, false), { x: 0, y: 1 })
  })

  it('Android right edge tilted down → things fall right', () => {
    close(tiltToScreenGravity({ x: -9.81, y: 0 }, 0, false), { x: 1, y: 0 })
  })

  it('iOS portrait upright (mirrored sign convention) → falls toward screen bottom', () => {
    close(tiltToScreenGravity({ x: 0, y: -9.81 }, 0, true), { x: 0, y: 1 })
  })

  it('Android landscape (rotated 90°) upright → still falls toward screen bottom', () => {
    close(tiltToScreenGravity({ x: 9.81, y: 0 }, 90, false), { x: 0, y: 1 })
  })

  it('never exceeds ±1 per axis for realistic tilt', () => {
    const g = tiltToScreenGravity({ x: 9.81, y: 9.81 }, 0, false)
    expect(Math.abs(g.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(g.y)).toBeLessThanOrEqual(1)
  })
})
