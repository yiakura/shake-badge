export interface Point {
  x: number
  y: number
}

/**
 * Convex hull via Andrew's monotone chain, counter-clockwise in screen coords.
 * Returns the input when fewer than 3 points.
 */
export function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return [...points]
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

  const lower: Point[] = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop()
    }
    lower.push(p)
  }
  const upper: Point[] = []
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop()
    }
    upper.push(p)
  }
  lower.pop()
  upper.pop()
  return [...lower, ...upper]
}

/** area centroid of a simple polygon (falls back to vertex mean for degenerate input) */
export function polygonCentroid(polygon: Point[]): Point {
  if (polygon.length === 0) return { x: 0, y: 0 }
  let area = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    const f = a.x * b.y - b.x * a.y
    area += f
    cx += (a.x + b.x) * f
    cy += (a.y + b.y) * f
  }
  if (Math.abs(area) < 1e-9) {
    const mean = polygon.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
    return { x: mean.x / polygon.length, y: mean.y / polygon.length }
  }
  area *= 0.5
  return { x: cx / (6 * area), y: cy / (6 * area) }
}

/**
 * Sample an RGBA buffer on a grid and return the opaque sample points.
 * Coordinates are pixel positions in the source image.
 */
export function opaqueSamplePoints(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  samples: number,
  alphaMin = 24,
): Point[] {
  const step = Math.max(1, Math.floor(Math.max(width, height) / samples))
  const points: Point[] = []
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (rgba[(y * width + x) * 4 + 3] >= alphaMin) points.push({ x, y })
    }
  }
  return points
}
