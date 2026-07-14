/** 'sticker' = die-cut look: solid margin following the image edge (alpha) or a card frame (opaque) */
export type ImageShape = 'circle' | 'rounded' | 'sticker'
export type NamePosition = 'top' | 'bottom'
export type NameDirection = 'horizontal' | 'vertical'
/** 'source' = use the PNG's own silhouette for mask + collision */
export type ImageShapeMode = 'global' | 'source'
export type OutlineMode = 'none' | 'color'

export interface BadgeBackground {
  type: 'solid' | 'gradient' | 'image'
  from: string
  to?: string
  /** gradient direction in degrees (CSS linear-gradient convention) */
  angle?: number
}
// type 'image': the blob lives in the db 'assets' store (key 'background');
// from/to remain as the fallback color while the blob loads

export interface BadgeStyle {
  background: BadgeBackground
  textColor: string
  /** optional glow color applied to the stage name (neon themes) */
  nameGlow?: string
  fontSizePx: number
}

/** user-facing physics feel, layered on top of the constants in config/physics.ts */
export interface PhysicsTuning {
  /** tilt gravity multiplier (×) */
  gravity: number
  /** restitution 0..1 */
  bounciness: number
  /** shake force multiplier (sensor + manual) (×) */
  shakeStrength: number
  /** air drag multiplier — higher stops motion sooner (×) */
  airDrag: number
}

/** square crop window in source-image pixel coordinates */
export interface CropParams {
  x: number
  y: number
  size: number
}

export interface ImageRecord {
  id: string
  /** compressed source image (long edge ≤ 1024) — kept so re-cropping never loses quality */
  originalBlob: Blob
  /** square crop used for thumbnails and physics sprites */
  croppedBlob: Blob
  crop: CropParams
  createdAt: number
  /** per-image multiplier on the global base size */
  sizeScale: number
  shapeMode: ImageShapeMode
  /** upload had usable transparency (enables shapeMode 'source') */
  hasAlpha: boolean
}

export interface BadgeSettings {
  schemaVersion: 2
  name: string
  nameLine2: string
  nameDirection: NameDirection
  showName: boolean
  /** draw a dark outline + drop shadow behind the name for legibility */
  nameShadow: boolean
  namePosition: NamePosition
  themeId: string
  style: BadgeStyle
  imageShape: ImageShape
  /** base body diameter as a percentage of min(viewport width, height) */
  imageBasePercent: number
  imageOutline: OutlineMode
  imageOutlineColor: string
  physics: PhysicsTuning
  /** display name of the uploaded name font ('' = built-in font); blob lives in db 'assets' */
  customFontName: string
  /** image ids in display order */
  imageIds: string[]
  setupCompleted: boolean
  updatedAt: number
}

export const SETTINGS_SCHEMA_VERSION = 2 as const

/** shape of a v1 settings record, kept only for migration */
export interface LegacySettingsV1 {
  schemaVersion: 1
  name: string
  showName: boolean
  namePosition: NamePosition
  themeId: string
  style: {
    background: BadgeBackground
    textColor: string
    nameGlow?: string
    fontSize: 'sm' | 'md' | 'lg'
  }
  imageShape: ImageShape
  imageSize: 'sm' | 'md' | 'lg'
  imageIds: string[]
  setupCompleted: boolean
  updatedAt: number
}

export type StoredSettings = BadgeSettings | LegacySettingsV1
