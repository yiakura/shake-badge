import { useEffect, useRef, type RefObject } from 'react'
import type { PhysicsController } from '../services/physics'
import { PHYSICS } from '../config/physics'
import { STAGE } from '../config/stage'
import { centroid, clamp, distance, pinchFactor, snapToLine, type Point } from '../utils/gestureMath'

export interface NameLineHit {
  index: number
  el: HTMLElement
  scale: number
}

export interface StageGestureProps {
  hostRef: RefObject<HTMLElement | null>
  controllerRef: RefObject<PhysicsController | null>
  /** two-finger gestures active (false while locked or an overlay is up) */
  enabled: boolean
  /** base name font size (px) before the custom scale multiplier */
  fontBasePx: number
  /** which name line (if any) sits under a viewport point */
  hitNameLine: (x: number, y: number) => NameLineHit | null
  getImageSizeScale: (imageId: string) => number
  onReveal: () => void
  onNameCommit: (index: number, offset: { x: number; y: number }, scale: number) => void
  onImageCommit: (imageId: string, sizeScale: number) => void
}

type Gesture =
  | { kind: 'name'; index: number; el: HTMLElement; startDist: number; startCentroid: Point; startScale: number; startCenter: Point; center: Point; scale: number }
  | { kind: 'image'; bodyId: number; imageId: string; startDist: number; startRel: number }

/**
 * Multi-touch layer over the physics canvas:
 *  - two fingers on an image     → pinch-zoom that image (persist size)
 *  - two fingers on a name line  → drag (center-line snap) + pinch-zoom that line (persist)
 *  - single tap on empty space   → reveal the controls
 * Each name line is targeted independently. Single-finger body dragging stays with Matter.
 */
export function useStageGestures(props: StageGestureProps): void {
  const propsRef = useRef(props)
  propsRef.current = props

  const pointers = useRef(new Map<number, Point>())
  const gesture = useRef<Gesture | null>(null)
  const tap = useRef<{ x: number; y: number; time: number } | null>(null)
  const twoFingerUsed = useRef(false)

  useEffect(() => {
    const host = propsRef.current.hostRef.current
    if (!host) return

    const viewport = () => {
      const rect = host.getBoundingClientRect()
      return { left: rect.left, top: rect.top, w: rect.width, h: rect.height }
    }
    const points = () => [...pointers.current.values()]

    const beginGesture = () => {
      const p = propsRef.current
      if (!p.enabled) return
      const pts = points()
      if (pts.length < 2) return
      const c = centroid(pts)
      const vp = viewport()

      // a name line takes priority when the pinch lands on it
      const nameHit = p.hitNameLine(c.x, c.y)
      if (nameHit) {
        const r = nameHit.el.getBoundingClientRect()
        const center = { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 }
        p.controllerRef.current?.suspendDrag()
        gesture.current = {
          kind: 'name',
          index: nameHit.index,
          el: nameHit.el,
          startDist: distance(pts[0], pts[1]),
          startCentroid: c,
          startScale: nameHit.scale,
          startCenter: center,
          center,
          scale: nameHit.scale,
        }
        twoFingerUsed.current = true
        return
      }

      const hit = p.controllerRef.current?.bodyAt(c.x - vp.left, c.y - vp.top)
      if (hit) {
        p.controllerRef.current?.suspendDrag()
        gesture.current = {
          kind: 'image',
          bodyId: hit.bodyId,
          imageId: hit.imageId,
          startDist: distance(pts[0], pts[1]),
          startRel: p.controllerRef.current?.getBodyRelativeScale(hit.bodyId) ?? 1,
        }
        twoFingerUsed.current = true
      }
    }

    const applyNameLive = (g: Extract<Gesture, { kind: 'name' }>) => {
      g.el.style.left = `${g.center.x}px`
      g.el.style.top = `${g.center.y}px`
      g.el.style.fontSize = `${propsRef.current.fontBasePx * g.scale}px`
    }

    const onDown = (event: PointerEvent) => {
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.current.size === 1) {
        tap.current = { x: event.clientX, y: event.clientY, time: Date.now() }
        twoFingerUsed.current = false
      }
      if (pointers.current.size === 2 && !gesture.current) beginGesture()
    }

    const onMove = (event: PointerEvent) => {
      if (!pointers.current.has(event.pointerId)) return
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      const g = gesture.current
      if (!g || pointers.current.size < 2) return
      event.preventDefault()
      const pts = points()
      const c = centroid([pts[0], pts[1]])
      const factor = pinchFactor(g.startDist, distance(pts[0], pts[1]))

      if (g.kind === 'image') {
        propsRef.current.controllerRef.current?.setBodyRelativeScale(g.bodyId, g.startRel * factor)
      } else {
        const vp = viewport()
        g.scale = clamp(g.startScale * factor, STAGE.nameScaleMin, STAGE.nameScaleMax)
        g.center = {
          x: snapToLine(g.startCenter.x + (c.x - g.startCentroid.x), vp.left + vp.w / 2, STAGE.nameSnapPx).value,
          y: snapToLine(g.startCenter.y + (c.y - g.startCentroid.y), vp.top + vp.h / 2, STAGE.nameSnapPx).value,
        }
        applyNameLive(g)
      }
    }

    const finishGesture = () => {
      const g = gesture.current
      const p = propsRef.current
      if (!g) return
      if (g.kind === 'image') {
        const rel = p.controllerRef.current?.getBodyRelativeScale(g.bodyId) ?? 1
        const size = clamp(p.getImageSizeScale(g.imageId) * rel, PHYSICS.imagePinchMin, PHYSICS.imagePinchMax)
        p.onImageCommit(g.imageId, size)
      } else {
        const vp = viewport()
        p.onNameCommit(g.index, { x: (g.center.x - vp.left) / vp.w, y: (g.center.y - vp.top) / vp.h }, g.scale)
      }
      p.controllerRef.current?.resumeDrag()
      gesture.current = null
    }

    const onUp = (event: PointerEvent) => {
      pointers.current.delete(event.pointerId)
      if (gesture.current && pointers.current.size < 2) finishGesture()
      if (pointers.current.size === 0) {
        const start = tap.current
        tap.current = null
        if (start && !twoFingerUsed.current) {
          const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y)
          if (moved < 12 && Date.now() - start.time < 500) propsRef.current.onReveal()
        }
      }
    }

    host.addEventListener('pointerdown', onDown)
    host.addEventListener('pointermove', onMove, { passive: false })
    host.addEventListener('pointerup', onUp)
    host.addEventListener('pointercancel', onUp)
    return () => {
      host.removeEventListener('pointerdown', onDown)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerup', onUp)
      host.removeEventListener('pointercancel', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
