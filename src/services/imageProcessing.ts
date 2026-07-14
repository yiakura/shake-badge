import { LIMITS } from '../config/limits'
import type { CropParams, ImageRecord } from '../types/badge'

export type DecodedImage = ImageBitmap | HTMLImageElement

function isBitmap(source: DecodedImage): source is ImageBitmap {
  return typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap
}

function sizeOf(source: DecodedImage): { width: number; height: number } {
  return isBitmap(source)
    ? { width: source.width, height: source.height }
    : { width: source.naturalWidth, height: source.naturalHeight }
}

export function releaseDecoded(source: DecodedImage): void {
  if (isBitmap(source)) source.close()
}

function loadViaImgElement(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image-decode-failed'))
    }
    img.src = url
  })
}

export async function decodeImage(blob: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob)
    } catch {
      // some formats/edge cases fail in createImageBitmap — fall back to <img>
    }
  }
  return loadViaImgElement(blob)
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/** encode as WebP; browsers without WebP encoding (older Safari) fall back to JPEG on white */
async function encodeCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  const webp = await canvasToBlob(canvas, 'image/webp', LIMITS.compressQuality)
  if (webp && webp.type === 'image/webp') return webp

  const flattened = document.createElement('canvas')
  flattened.width = canvas.width
  flattened.height = canvas.height
  const ctx = flattened.getContext('2d')
  if (!ctx) throw new Error('canvas-unavailable')
  ctx.fillStyle = '#ffffff' // JPEG has no alpha — flatten transparency onto white
  ctx.fillRect(0, 0, flattened.width, flattened.height)
  ctx.drawImage(canvas, 0, 0)
  const jpeg = await canvasToBlob(flattened, 'image/jpeg', LIMITS.compressQuality)
  if (!jpeg) throw new Error('image-encode-failed')
  return jpeg
}

export interface CompressedImage {
  blob: Blob
  width: number
  height: number
  hasAlpha: boolean
}

/** sampled scan for any meaningfully transparent pixel */
function canvasHasAlpha(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const rgba = ctx.getImageData(0, 0, width, height).data
    const step = Math.max(1, Math.floor(Math.max(width, height) / 64))
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        if (rgba[(y * width + x) * 4 + 3] < 250) return true
      }
    }
  } catch {
    // getImageData can fail in exotic contexts — treat as opaque
  }
  return false
}

/** downscale so the long edge is ≤ LIMITS.maxImageEdge and re-encode */
export async function compressImage(file: Blob): Promise<CompressedImage> {
  const source = await decodeImage(file)
  const { width, height } = sizeOf(source)
  if (width === 0 || height === 0) {
    releaseDecoded(source)
    throw new Error('image-decode-failed')
  }
  const scale = Math.min(1, LIMITS.maxImageEdge / Math.max(width, height))
  const targetW = Math.max(1, Math.round(width * scale))
  const targetH = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    releaseDecoded(source)
    throw new Error('canvas-unavailable')
  }
  ctx.drawImage(source, 0, 0, targetW, targetH)
  releaseDecoded(source)

  // only png/webp uploads can carry alpha; jpeg never does
  const mayHaveAlpha = file.type === 'image/png' || file.type === 'image/webp'
  const hasAlpha = mayHaveAlpha && canvasHasAlpha(ctx, targetW, targetH)

  const blob = await encodeCanvas(canvas)
  // the jpeg fallback flattens transparency — the silhouette option is gone then
  return { blob, width: targetW, height: targetH, hasAlpha: hasAlpha && blob.type !== 'image/jpeg' }
}

/** largest centered square inside the image — fills the frame, crops the long side */
export function centerSquareCrop(width: number, height: number): CropParams {
  const size = Math.min(width, height)
  return {
    x: Math.round((width - size) / 2),
    y: Math.round((height - size) / 2),
    size,
  }
}

/** square that *contains* the whole image — letterboxes the short side so nothing is cut off */
export function containSquareCrop(width: number, height: number): CropParams {
  const size = Math.max(width, height)
  return {
    x: Math.round((width - size) / 2),
    y: Math.round((height - size) / 2),
    size,
  }
}

/** cut a square window out of the (compressed) source and encode it */
export async function cropToSquare(source: Blob, crop: CropParams): Promise<Blob> {
  const decoded = await decodeImage(source)
  const { width: iw, height: ih } = sizeOf(decoded)
  const outputSize = Math.max(1, Math.min(LIMITS.croppedEdge, Math.round(crop.size)))

  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    releaseDecoded(decoded)
    throw new Error('canvas-unavailable')
  }
  // draw only the part of the crop window that overlaps the image; any excess
  // (contain-crop of a long image) stays transparent so the graphic isn't cut off
  const scale = outputSize / crop.size
  const sx = Math.max(0, crop.x)
  const sy = Math.max(0, crop.y)
  const sw = Math.min(iw, crop.x + crop.size) - sx
  const sh = Math.min(ih, crop.y + crop.size) - sy
  if (sw > 0 && sh > 0) {
    ctx.drawImage(decoded, sx, sy, sw, sh, (sx - crop.x) * scale, (sy - crop.y) * scale, sw * scale, sh * scale)
  }
  releaseDecoded(decoded)

  return encodeCanvas(canvas)
}

/** full upload pipeline: compress → default crop → record */
export async function createImageRecord(file: File): Promise<ImageRecord> {
  const { blob: originalBlob, width, height, hasAlpha } = await compressImage(file)
  // transparent PNGs are usually stickers/logos where the whole shape matters →
  // contain (letterbox) them; opaque photos still fill the frame via center-crop
  const crop = hasAlpha ? containSquareCrop(width, height) : centerSquareCrop(width, height)
  const croppedBlob = await cropToSquare(originalBlob, crop)
  return {
    id: crypto.randomUUID(),
    originalBlob,
    croppedBlob,
    crop,
    createdAt: Date.now(),
    sizeScale: 1,
    shapeMode: 'global',
    hasAlpha,
  }
}
