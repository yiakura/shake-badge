import Matter from 'matter-js'
import { PHYSICS, defaultPhysicsTuning } from '../config/physics'
import type { ImageShape, ImageShapeMode, OutlineMode, PhysicsTuning } from '../types/badge'
import type { Vec2 } from '../utils/motionMath'
import { clampMagnitude } from '../utils/motionMath'
import { convexHull, opaqueSamplePoints, polygonCentroid, type Point } from '../utils/geometry'
import { decodeImage, releaseDecoded } from './imageProcessing'

export interface SpriteSource {
  id: string
  blob: Blob
  sizeScale: number
  shapeMode: ImageShapeMode
  hasAlpha: boolean
}

export interface PhysicsStartOptions {
  shape: ImageShape
  /** base body diameter as % of min(viewport) */
  basePercent: number
  outline: { mode: OutlineMode; color: string }
  /** user feel knobs layered on the config constants */
  tuning: PhysicsTuning
}

/** per-body diameters honoring per-image scale, clamps, and the total-area cap */
export function computeDiameters(
  width: number,
  height: number,
  scales: number[],
  basePercent: number,
): number[] {
  const base = Math.min(width, height) * (basePercent / 100)
  const diameters = scales.map((scale) =>
    Math.min(Math.max(base * scale, PHYSICS.minBodyPx), PHYSICS.maxBodyPx),
  )
  const maxTotalArea = width * height * PHYSICS.maxAreaRatio
  const totalArea = diameters.reduce((sum, d) => sum + Math.PI * (d / 2) ** 2, 0)
  if (totalArea > maxTotalArea) {
    const shrink = Math.sqrt(maxTotalArea / totalArea)
    return diameters.map((d) => Math.max(d * shrink, PHYSICS.minBodyPx * 0.75))
  }
  return diameters
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, radius: number): void {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, size, size, radius)
    return
  }
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + size, y, x + size, y + size, radius)
  ctx.arcTo(x + size, y + size, x, y + size, radius)
  ctx.arcTo(x, y + size, x, y, radius)
  ctx.arcTo(x, y, x + size, y, radius)
  ctx.closePath()
}

interface TextureSpec {
  mode: ImageShape | 'source'
  texturePx: number
  /** 0 = no outline */
  outlinePx: number
  outlineColor: string
  hasAlpha: boolean
}

interface BakedTexture {
  canvas: HTMLCanvasElement
  /** texture-space silhouette hull ('source' / die-cut modes) */
  hull?: Point[]
  /** texture-space area centroid of the hull */
  centroid?: Point
}

function hullFromCanvas(ctx: CanvasRenderingContext2D, px: number): Pick<BakedTexture, 'hull' | 'centroid'> {
  const rgba = ctx.getImageData(0, 0, px, px).data
  const hull = convexHull(opaqueSamplePoints(rgba, px, px, PHYSICS.alphaHullSamples))
  return hull.length >= 3 ? { hull, centroid: polygonCentroid(hull) } : {}
}

/** solid-color copy of a canvas' alpha shape */
function silhouetteOf(base: HTMLCanvasElement, color: string): HTMLCanvasElement | null {
  const silhouette = document.createElement('canvas')
  silhouette.width = base.width
  silhouette.height = base.height
  const ctx = silhouette.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(base, 0, 0)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = color
  ctx.fillRect(0, 0, silhouette.width, silhouette.height)
  return silhouette
}

/** bake mask + optional colored outline into an offscreen canvas sprite */
async function bakeTexture(blob: Blob, spec: TextureSpec): Promise<BakedTexture> {
  const { texturePx: px, outlinePx, outlineColor } = spec
  const source = await decodeImage(blob)
  const canvas = document.createElement('canvas')
  canvas.width = px
  canvas.height = px
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    releaseDecoded(source)
    throw new Error('canvas-unavailable')
  }

  if (spec.mode === 'source') {
    // the PNG's own alpha is the mask; trace it for the collision hull
    const base = document.createElement('canvas')
    base.width = px
    base.height = px
    const baseCtx = base.getContext('2d')
    if (!baseCtx) {
      releaseDecoded(source)
      throw new Error('canvas-unavailable')
    }
    baseCtx.drawImage(source, 0, 0, px, px)
    releaseDecoded(source)

    const shape = hullFromCanvas(baseCtx, px)

    if (outlinePx > 0) {
      // colored silhouette stamped around the image = outline following the alpha edge
      const silhouette = silhouetteOf(base, outlineColor)
      if (silhouette) {
        for (let i = 0; i < 16; i++) {
          const angle = (i / 16) * Math.PI * 2
          ctx.drawImage(silhouette, Math.cos(angle) * outlinePx, Math.sin(angle) * outlinePx)
        }
      }
    }
    ctx.drawImage(base, 0, 0)
    return { canvas, ...shape }
  }

  if (spec.mode === 'sticker') {
    // die-cut sticker: margin hugging the image edge. The edge is transparent by
    // default (subtle cut-out) and only takes a color when 色線 is chosen.
    const marginPx = Math.max(3, Math.round(px * PHYSICS.stickerMarginRatio))
    const hasColorEdge = outlinePx > 0
    const inner = px - marginPx * 2

    if (spec.hasAlpha) {
      // dilate the alpha silhouette by the margin (only visible when colored), art on top
      const base = document.createElement('canvas')
      base.width = px
      base.height = px
      const baseCtx = base.getContext('2d')
      if (!baseCtx) {
        releaseDecoded(source)
        throw new Error('canvas-unavailable')
      }
      baseCtx.drawImage(source, marginPx, marginPx, inner, inner)
      releaseDecoded(source)

      if (hasColorEdge) {
        const silhouette = silhouetteOf(base, outlineColor)
        if (silhouette) {
          for (const radius of [marginPx, marginPx * 0.55]) {
            for (let i = 0; i < 24; i++) {
              const angle = (i / 24) * Math.PI * 2
              ctx.drawImage(silhouette, Math.cos(angle) * radius, Math.sin(angle) * radius)
            }
          }
          ctx.drawImage(silhouette, 0, 0)
        }
      }
      ctx.drawImage(base, 0, 0)
      // collision follows the (dilated) die-cut shape
      return { canvas, ...hullFromCanvas(ctx, px) }
    }

    // opaque photo → sticker card: rounded picture with an optional colored frame
    const outerRadius = px * 0.12
    if (hasColorEdge) {
      ctx.beginPath()
      roundedRectPath(ctx, 0, 0, px, outerRadius)
      ctx.fillStyle = outlineColor
      ctx.fill()
    }
    ctx.save()
    ctx.beginPath()
    roundedRectPath(ctx, marginPx, marginPx, inner, outerRadius * 0.6)
    ctx.clip()
    ctx.drawImage(source, marginPx, marginPx, inner, inner)
    ctx.restore()
    releaseDecoded(source)
    return { canvas }
  }

  // circle / rounded: clip, draw, then stroke the same path for the outline
  const inset = outlinePx > 0 ? outlinePx / 2 + 1 : 0
  const size = px - inset * 2
  ctx.save()
  ctx.beginPath()
  if (spec.mode === 'circle') {
    ctx.arc(px / 2, px / 2, size / 2, 0, Math.PI * 2)
  } else {
    roundedRectPath(ctx, inset, inset, size, size * 0.22)
  }
  ctx.clip()
  ctx.drawImage(source, 0, 0, px, px)
  ctx.restore()
  releaseDecoded(source)

  if (outlinePx > 0) {
    ctx.beginPath()
    if (spec.mode === 'circle') {
      ctx.arc(px / 2, px / 2, size / 2, 0, Math.PI * 2)
    } else {
      roundedRectPath(ctx, inset, inset, size, size * 0.22)
    }
    ctx.lineWidth = outlinePx
    ctx.strokeStyle = outlineColor
    ctx.stroke()
  }
  return { canvas }
}

function scatterPositions(count: number, width: number, height: number, maxDiameter: number): Vec2[] {
  const margin = maxDiameter / 2 + 12
  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)
  const cellW = (width - margin * 2) / cols
  const cellH = (height - margin * 2) / rows
  const spots: Vec2[] = []
  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const jitterX = (Math.random() - 0.5) * Math.min(cellW * 0.4, 30)
    const jitterY = (Math.random() - 0.5) * Math.min(cellH * 0.4, 30)
    spots.push({
      x: Math.min(Math.max(margin + cellW * (col + 0.5) + jitterX, margin), width - margin),
      y: Math.min(Math.max(margin + cellH * (row + 0.5) + jitterY, margin), height - margin),
    })
  }
  return spots
}

/**
 * Owns the whole Matter.js world; completely decoupled from React.
 * All tuning constants live in config/physics.ts.
 */
export class PhysicsController {
  private engine: Matter.Engine | null = null
  private render: Matter.Render | null = null
  private runner: Matter.Runner | null = null
  private bodies: Matter.Body[] = []
  private walls: Matter.Body[] = []
  /** effective containment radius per body id */
  private radii = new Map<number, number>()
  private width = 0
  private height = 0
  private maxDiameter = 0
  private tuning: PhysicsTuning = defaultPhysicsTuning()
  private floatMode = false
  private detachEvents: (() => void) | null = null
  private disposed = false

  async start(container: HTMLElement, sprites: SpriteSource[], options: PhysicsStartOptions): Promise<void> {
    if (this.disposed || sprites.length === 0) return
    const width = container.clientWidth
    const height = container.clientHeight
    if (width === 0 || height === 0) return
    this.width = width
    this.height = height

    const pixelRatio = Math.min(window.devicePixelRatio || 1, PHYSICS.maxPixelRatio)
    const diameters = computeDiameters(
      width,
      height,
      sprites.map((sprite) => sprite.sizeScale),
      options.basePercent,
    )
    this.maxDiameter = Math.max(...diameters)

    const baked = await Promise.all(
      sprites.map((sprite, index) => {
        const texturePx = Math.max(2, Math.round(diameters[index] * pixelRatio))
        const useSource = sprite.shapeMode === 'source' && sprite.hasAlpha
        const outlinePx =
          options.outline.mode === 'color'
            ? Math.max(2, Math.round(diameters[index] * PHYSICS.outlineWidthRatio * pixelRatio))
            : 0
        return bakeTexture(sprite.blob, {
          mode: useSource ? 'source' : options.shape,
          texturePx,
          outlinePx,
          outlineColor: options.outline.color,
          hasAlpha: sprite.hasAlpha,
        })
      }),
    )
    if (this.disposed) return // unmounted while decoding

    this.tuning = options.tuning
    const engine = Matter.Engine.create()
    engine.gravity.x = 0
    engine.gravity.y = PHYSICS.gravityScale * this.tuning.gravity

    const render = Matter.Render.create({
      element: container,
      engine,
      options: { width, height, pixelRatio, background: 'transparent', wireframes: false },
    })
    Matter.Render.setPixelRatio(render, pixelRatio)

    const textureMap = (render as unknown as { textures: Record<string, CanvasImageSource> }).textures
    const spots = scatterPositions(sprites.length, width, height, this.maxDiameter)

    this.bodies = sprites.map((sprite, index) => {
      const diameter = diameters[index]
      const texture = baked[index]
      const texturePx = texture.canvas.width
      const key = `sprite:${sprite.id}`
      textureMap[key] = texture.canvas
      const scale = diameter / texturePx
      const common: Matter.IChamferableBodyDefinition = {
        restitution: this.tuning.bounciness,
        friction: PHYSICS.friction,
        frictionAir: PHYSICS.frictionAir * this.tuning.airDrag,
        density: PHYSICS.density,
        render: { sprite: { texture: key, xScale: scale, yScale: scale } },
      }

      let body: Matter.Body | null = null
      let radius = diameter / 2
      if (texture.hull && texture.centroid) {
        const bodyVerts = texture.hull.map((p) => ({ x: p.x * scale, y: p.y * scale }))
        body = Matter.Bodies.fromVertices(spots[index].x, spots[index].y, [bodyVerts], common)
        if (body) {
          // align the sprite so its pixels sit on the collision hull
          // (offsets exist at runtime but are missing from @types/matter-js)
          const spriteRender = body.render.sprite as
            | (Matter.IBodyRenderOptionsSprite & { xOffset: number; yOffset: number })
            | undefined
          if (spriteRender) {
            spriteRender.xOffset = texture.centroid.x / texturePx
            spriteRender.yOffset = texture.centroid.y / texturePx
          }
          radius = Math.max(
            ...texture.hull.map((p) =>
              Math.hypot((p.x - texture.centroid!.x) * scale, (p.y - texture.centroid!.y) * scale),
            ),
          )
        }
      }
      if (!body) {
        const hullIntended =
          sprite.hasAlpha && (sprite.shapeMode === 'source' || options.shape === 'sticker')
        body =
          options.shape === 'circle' || hullIntended
            ? Matter.Bodies.circle(spots[index].x, spots[index].y, diameter / 2, common)
            : Matter.Bodies.rectangle(spots[index].x, spots[index].y, diameter, diameter, {
                ...common,
                chamfer: { radius: diameter * 0.22 },
              })
      }
      this.radii.set(body.id, radius)
      return body
    })

    this.walls = this.buildWalls(width, height)
    Matter.Composite.add(engine.world, [...this.bodies, ...this.walls])

    // touch + mouse dragging
    const mouse = Matter.Mouse.create(render.canvas)
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    })
    Matter.Composite.add(engine.world, mouseConstraint)
    render.mouse = mouse

    const onTick = () => {
      this.floatTick()
      this.containBodies()
    }
    Matter.Events.on(engine, 'afterUpdate', onTick)
    this.detachEvents = () => Matter.Events.off(engine, 'afterUpdate', onTick)

    const runner = Matter.Runner.create()
    Matter.Runner.run(runner, engine)
    Matter.Render.run(render)

    this.engine = engine
    this.render = render
    this.runner = runner
    if (this.floatMode) this.enterFloat() // toggled on before the world finished building
  }

  private buildWalls(width: number, height: number): Matter.Body[] {
    const thickness = PHYSICS.wallThickness
    const options: Matter.IChamferableBodyDefinition = {
      isStatic: true,
      friction: 0.05,
      restitution: 0.9,
      render: { visible: false },
    }
    return [
      Matter.Bodies.rectangle(width / 2, -thickness / 2, width + thickness * 2, thickness, options),
      Matter.Bodies.rectangle(width / 2, height + thickness / 2, width + thickness * 2, thickness, options),
      Matter.Bodies.rectangle(-thickness / 2, height / 2, thickness, height + thickness * 2, options),
      Matter.Bodies.rectangle(width + thickness / 2, height / 2, thickness, height + thickness * 2, options),
    ]
  }

  /** hard safety net: clamp positions into the viewport and cap speed */
  private containBodies(): void {
    for (const body of this.bodies) {
      const radius = this.radii.get(body.id) ?? this.maxDiameter / 2
      let { x, y } = body.position
      let { x: vx, y: vy } = body.velocity
      let moved = false
      if (x < radius) {
        x = radius
        vx = Math.abs(vx) * 0.5
        moved = true
      } else if (x > this.width - radius) {
        x = this.width - radius
        vx = -Math.abs(vx) * 0.5
        moved = true
      }
      if (y < radius) {
        y = radius
        vy = Math.abs(vy) * 0.5
        moved = true
      } else if (y > this.height - radius) {
        y = this.height - radius
        vy = -Math.abs(vy) * 0.5
        moved = true
      }
      if (moved) {
        Matter.Body.setPosition(body, { x, y })
        Matter.Body.setVelocity(body, { x: vx, y: vy })
      }
      const speed = Math.hypot(body.velocity.x, body.velocity.y)
      if (speed > PHYSICS.maxSpeed) {
        const scale = PHYSICS.maxSpeed / speed
        Matter.Body.setVelocity(body, { x: body.velocity.x * scale, y: body.velocity.y * scale })
      }
    }
  }

  /** viewport size or orientation changed — rebuild walls and pull bodies inside */
  resize(width: number, height: number): void {
    if (!this.engine || !this.render || width === 0 || height === 0) return
    this.width = width
    this.height = height
    this.render.options.width = width
    this.render.options.height = height
    this.render.bounds.max.x = width
    this.render.bounds.max.y = height
    const pixelRatio = Math.min(window.devicePixelRatio || 1, PHYSICS.maxPixelRatio)
    Matter.Render.setPixelRatio(this.render, pixelRatio)

    Matter.Composite.remove(this.engine.world, this.walls)
    this.walls = this.buildWalls(width, height)
    Matter.Composite.add(this.engine.world, this.walls)
    this.containBodies()
  }

  /** ceiling for applied forces — strong user tuning may raise it, capped at 2× */
  private forceCap(): number {
    return PHYSICS.maxForce * Math.min(Math.max(this.tuning.shakeStrength, 1), 2)
  }

  /** normalized screen-frame gravity (−1..1 per axis), already smoothed by the caller */
  setGravity(gravity: Vec2): void {
    if (!this.engine || this.floatMode) return // float mode owns gravity
    const scale = PHYSICS.gravityScale * this.tuning.gravity
    this.engine.gravity.x = gravity.x * scale
    this.engine.gravity.y = gravity.y * scale
  }

  /** random float: no gravity, bodies drift and gently self-propel */
  setFloatMode(on: boolean): void {
    if (this.floatMode === on) return
    this.floatMode = on
    if (!this.engine) return
    if (on) this.enterFloat()
    else this.exitFloat()
  }

  private enterFloat(): void {
    if (!this.engine) return
    this.engine.gravity.x = 0
    this.engine.gravity.y = 0
    // kick each body off in a random direction so drift starts immediately
    for (const body of this.bodies) {
      const angle = Math.random() * Math.PI * 2
      const strength = PHYSICS.floatImpulse * 6 * body.mass
      Matter.Body.applyForce(body, body.position, {
        x: Math.cos(angle) * strength,
        y: Math.sin(angle) * strength,
      })
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.05)
    }
  }

  private exitFloat(): void {
    if (!this.engine) return
    this.engine.gravity.x = 0
    this.engine.gravity.y = PHYSICS.gravityScale * this.tuning.gravity
  }

  /** keep floating bodies drifting: nudge the slow ones, cap the fast ones */
  private floatTick(): void {
    if (!this.floatMode) return
    for (const body of this.bodies) {
      const speed = Math.hypot(body.velocity.x, body.velocity.y)
      if (speed < PHYSICS.floatMinSpeed) {
        const angle = Math.random() * Math.PI * 2
        const strength = PHYSICS.floatImpulse * body.mass
        Matter.Body.applyForce(body, body.position, {
          x: Math.cos(angle) * strength,
          y: Math.sin(angle) * strength,
        })
      } else if (speed > PHYSICS.floatMaxSpeed) {
        const s = PHYSICS.floatMaxSpeed / speed
        Matter.Body.setVelocity(body, { x: body.velocity.x * s, y: body.velocity.y * s })
      }
    }
  }

  /** impulse from sensor shaking; direction is the screen-mapped linear acceleration */
  applyMotionShake(direction: Vec2, magnitude: number): void {
    const strength = Math.min(
      magnitude * PHYSICS.motionSensitivity * this.tuning.shakeStrength,
      this.forceCap(),
    )
    const unit = clampMagnitude(direction, 1)
    for (const body of this.bodies) {
      const jitterAngle = Math.random() * Math.PI * 2
      const jitter = 0.35
      const force = clampMagnitude(
        {
          x: (unit.x + Math.cos(jitterAngle) * jitter) * strength,
          y: (unit.y + Math.sin(jitterAngle) * jitter) * strength,
        },
        PHYSICS.maxForce,
      )
      this.applyForceWithSpin(body, force)
    }
  }

  /** 「搖一下」 button — random impulse on every body */
  shakeAll(intensity = 1): void {
    const strength = Math.min(
      PHYSICS.manualShakeForce * intensity * this.tuning.shakeStrength,
      this.forceCap(),
    )
    for (const body of this.bodies) {
      const angle = Math.random() * Math.PI * 2
      // bias upward so the toss reads as a playful pop
      const force = clampMagnitude(
        { x: Math.cos(angle) * strength, y: Math.sin(angle) * strength - strength * 0.6 },
        PHYSICS.maxForce,
      )
      this.applyForceWithSpin(body, force)
    }
  }

  private applyForceWithSpin(body: Matter.Body, force: Vec2): void {
    const scaled = { x: force.x * body.mass, y: force.y * body.mass }
    const offset = (this.radii.get(body.id) ?? this.maxDiameter / 2) * 0.5
    Matter.Body.applyForce(
      body,
      {
        x: body.position.x + (Math.random() - 0.5) * offset,
        y: body.position.y + (Math.random() - 0.5) * offset,
      },
      scaled,
    )
  }

  resetPositions(): void {
    if (this.bodies.length === 0) return
    const spots = scatterPositions(this.bodies.length, this.width, this.height, this.maxDiameter)
    this.bodies.forEach((body, index) => {
      Matter.Body.setPosition(body, spots[index])
      Matter.Body.setVelocity(body, { x: 0, y: 0 })
      Matter.Body.setAngularVelocity(body, 0)
      Matter.Body.setAngle(body, 0)
    })
  }

  destroy(): void {
    this.disposed = true
    this.detachEvents?.()
    this.detachEvents = null
    if (this.runner) Matter.Runner.stop(this.runner)
    if (this.render) {
      Matter.Render.stop(this.render)
      // Matter.Mouse listeners live on the canvas — removing it releases them
      this.render.canvas.remove()
    }
    if (this.engine) {
      Matter.Composite.clear(this.engine.world, false)
      Matter.Engine.clear(this.engine)
    }
    this.bodies = []
    this.walls = []
    this.radii.clear()
    this.engine = null
    this.render = null
    this.runner = null
  }
}
