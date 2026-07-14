import { describe, expect, it } from 'vitest'
import { computeDiameters } from './physics'
import { PHYSICS } from '../config/physics'

describe('computeDiameters', () => {
  it('applies per-image scale on the base size', () => {
    const [a, b] = computeDiameters(400, 800, [1, 2], 20)
    expect(a).toBeCloseTo(80) // 400 * 20%
    expect(b).toBeCloseTo(160)
  })

  it('clamps to the configured min/max', () => {
    const [tiny, huge] = computeDiameters(400, 800, [0.01, 100], 20)
    expect(tiny).toBe(PHYSICS.minBodyPx)
    expect(huge).toBe(PHYSICS.maxBodyPx)
  })

  it('shrinks everything together when the total area would flood the screen', () => {
    const many = computeDiameters(320, 480, Array.from({ length: 10 }, () => 2), 40)
    const total = many.reduce((sum, d) => sum + Math.PI * (d / 2) ** 2, 0)
    expect(total).toBeLessThanOrEqual(320 * 480 * PHYSICS.maxAreaRatio * 1.35) // floor keeps a little slack
    // relative order preserved
    expect(new Set(many).size).toBe(1)
  })
})
