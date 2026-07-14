/** input validation and image-pipeline limits */
export const LIMITS = {
  maxImages: 20,
  maxFileBytes: 10 * 1024 * 1024,
  maxNameLength: 20,
  /** long-edge cap for the compressed source image */
  maxImageEdge: 1024,
  /** output side length of the square crop */
  croppedEdge: 512,
  compressQuality: 0.8,
  /** accepted upload types mapped to their valid file extensions */
  acceptedTypes: {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
  },
  /** custom name font */
  maxFontBytes: 8 * 1024 * 1024,
  acceptedFontExtensions: ['.ttf', '.otf', '.woff', '.woff2'],
} as const

export const ACCEPT_ATTRIBUTE = Object.keys(LIMITS.acceptedTypes).join(',')
export const ACCEPT_FONT_ATTRIBUTE = LIMITS.acceptedFontExtensions.join(',')

/** slider ranges for the editor */
export const RANGES = {
  /** stage name font size (px) */
  fontSizePx: { min: 20, max: 96, step: 2, default: 48 },
  /** global image base size, % of min(viewport) — kept modest so up to 20 images fit */
  imageBasePercent: { min: 8, max: 32, step: 1, default: 18 },
  /** per-image multiplier on the base size */
  imageScale: { min: 0.5, max: 2, step: 0.05, default: 1 },
} as const

