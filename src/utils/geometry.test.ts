import { describe, expect, it } from 'vitest'
import { convexHull, opaqueSamplePoints, polygonCentroid, type Point } from './geometry'

const byXY = (a: Point, b: Point) => a.x - b.x || a.y - b.y

describe('convexHull', () => {
  it('drops interior points and keeps the square corners', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 5, y: 5 },
      { x: 3, y: 7 },
    ]
    const hull = convexHull(square)
    expect([...hull].sort(byXY)).toEqual(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ].sort(byXY),
    )
  })

  it('handles collinear points', () => {
    const hull = convexHull([
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 5 },
    ])
    expect(hull).toHaveLength(3)
  })

  it('passes through inputs with fewer than 3 points', () => {
    expect(convexHull([{ x: 1, y: 2 }])).toEqual([{ x: 1, y: 2 }])
  })
})

describe('polygonCentroid', () => {
  it('finds the center of a square', () => {
    const c = polygonCentroid([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
    ])
    expect(c.x).toBeCloseTo(2)
    expect(c.y).toBeCloseTo(2)
  })

  it('weights by area, not vertex density', () => {
    // extra vertices along one edge must not pull the centroid
    const c = polygonCentroid([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
    ])
    expect(c.x).toBeCloseTo(2)
    expect(c.y).toBeCloseTo(2)
  })
})

describe('opaqueSamplePoints', () => {
  it('returns only points where alpha exceeds the threshold', () => {
    // 4×2 image, left half opaque
    const w = 4
    const h = 2
    const rgba = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        rgba[(y * w + x) * 4 + 3] = x < 2 ? 255 : 0
      }
    }
    const points = opaqueSamplePoints(rgba, w, h, 4)
    expect(points.length).toBeGreaterThan(0)
    expect(points.every((p) => p.x < 2)).toBe(true)
  })
})
