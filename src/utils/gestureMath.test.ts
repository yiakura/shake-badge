import { describe, expect, it } from 'vitest'
import { centroid, clamp, distance, pinchFactor, snapToLine } from './gestureMath'

describe('clamp', () => {
  it('bounds a value to the range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(99, 0, 10)).toBe(10)
  })
})

describe('distance / centroid', () => {
  it('measures euclidean distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })
  it('averages points', () => {
    expect(centroid([{ x: 0, y: 0 }, { x: 4, y: 8 }])).toEqual({ x: 2, y: 4 })
  })
  it('centroid of empty is origin', () => {
    expect(centroid([])).toEqual({ x: 0, y: 0 })
  })
})

describe('pinchFactor', () => {
  it('is the ratio of current to start distance', () => {
    expect(pinchFactor(100, 200)).toBe(2)
    expect(pinchFactor(100, 50)).toBe(0.5)
  })
  it('is 1 when the start distance is zero (avoids div-by-zero)', () => {
    expect(pinchFactor(0, 100)).toBe(1)
  })
})

describe('snapToLine', () => {
  it('snaps to the line within the threshold', () => {
    expect(snapToLine(196, 200, 22)).toEqual({ value: 200, snapped: true })
    expect(snapToLine(200, 200, 22)).toEqual({ value: 200, snapped: true })
  })
  it('leaves the value alone outside the threshold', () => {
    expect(snapToLine(160, 200, 22)).toEqual({ value: 160, snapped: false })
  })
  it('snaps at exactly the threshold boundary', () => {
    expect(snapToLine(178, 200, 22)).toEqual({ value: 200, snapped: true })
    expect(snapToLine(177, 200, 22).snapped).toBe(false)
  })
})
