import { describe, expect, it } from 'vitest'
import { centerSquareCrop, containSquareCrop } from './imageProcessing'

describe('centerSquareCrop — fills the frame (crops the long side)', () => {
  it('is a no-op for a square', () => {
    expect(centerSquareCrop(500, 500)).toEqual({ x: 0, y: 0, size: 500 })
  })

  it('crops top/bottom of a tall image', () => {
    // 400×1000 → 400 square centered vertically
    expect(centerSquareCrop(400, 1000)).toEqual({ x: 0, y: 300, size: 400 })
  })

  it('crops left/right of a wide image', () => {
    expect(centerSquareCrop(1000, 400)).toEqual({ x: 300, y: 0, size: 400 })
  })
})

describe('containSquareCrop — keeps the whole image (letterboxes the short side)', () => {
  it('is a no-op for a square', () => {
    expect(containSquareCrop(500, 500)).toEqual({ x: 0, y: 0, size: 500 })
  })

  it('letterboxes the sides of a tall image so nothing is cut off', () => {
    // 400×1000 → 1000 square, negative x = transparent left/right padding, full height kept
    expect(containSquareCrop(400, 1000)).toEqual({ x: -300, y: 0, size: 1000 })
  })

  it('letterboxes top/bottom of a wide image', () => {
    expect(containSquareCrop(1000, 400)).toEqual({ x: 0, y: -300, size: 1000 })
  })

  it('always produces a square large enough to hold the whole image', () => {
    const crop = containSquareCrop(320, 900)
    expect(crop.size).toBe(900)
    expect(crop.x).toBeLessThanOrEqual(0)
    expect(crop.y).toBe(0)
  })
})
