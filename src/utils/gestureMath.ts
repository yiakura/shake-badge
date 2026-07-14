export interface Point {
  x: number
  y: number
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function centroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 }
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}

/** two-finger pinch scale factor relative to the gesture start */
export function pinchFactor(startDistance: number, currentDistance: number): number {
  return startDistance > 0 ? currentDistance / startDistance : 1
}

export interface Snap {
  value: number
  snapped: boolean
}

/** magnetically snap a coordinate to a line when within thresholdPx */
export function snapToLine(value: number, line: number, thresholdPx: number): Snap {
  return Math.abs(value - line) <= thresholdPx ? { value: line, snapped: true } : { value, snapped: false }
}
